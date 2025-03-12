import * as React from 'react';
import {
  CONSISTENCY_GROUP_LABEL,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
} from '@odf/mco/constants';
import {
  ACMManagedClusterViewKind,
  DRVolumeReplicationGroupKind,
} from '@odf/mco/types';
import {
  FieldLevelHelp,
  getAnnotations,
  getName,
  getNamespace,
  useCustomTranslation,
} from '@odf/shared';
import { BLOCK, FILESYSTEM } from '@odf/shared/constants/consistencyGroup';
import { ModalBody, ModalFooter } from '@odf/shared/modals';
import { referenceForModel } from '@odf/shared/utils';
import {
  GreenCheckCircleIcon,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  ButtonVariant,
  Divider,
  Flex,
  FlexItem,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  Select,
  SelectList,
  Text,
  TextVariants,
  SelectOption,
  PopoverPosition,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { ACMManagedClusterViewModel } from '../../../models';
import { ModalViewContext } from './utils/reducer';
import { DRInfoType } from './utils/types';

const FILTERS = ['all', 'block', 'filesystem'];

type VolumeConsistencyGroupViewProps = {
  setModalContext: (context: ModalViewContext) => void;
  drInfo?: DRInfoType;
};

type ConsistencyGroupInfo = {
  name: string;
  type: typeof BLOCK | typeof FILESYSTEM;
  namespace: string;
  state: string;
  lastSyncTime: string;
  pvcs: string[];
};

const getCGType = (cgName: string) =>
  cgName.startsWith('cephfs-') ? 'Filesystem' : 'Block';

const filterGroups = (
  groups: ConsistencyGroupInfo[],
  searchValue: string,
  selectedFilter: string
) => {
  const lowerSearch = searchValue.toLowerCase();
  return groups.filter(
    (group) =>
      (selectedFilter === 'all' ||
        group.type.toLowerCase() === selectedFilter.toLowerCase()) &&
      (group.name.toLowerCase().includes(lowerSearch) ||
        group.namespace.toLowerCase().includes(lowerSearch) ||
        group.pvcs.some((pvc) => pvc.toLowerCase().includes(lowerSearch)))
  );
};

export const VolumeConsistencyGroupView: React.FC<
  VolumeConsistencyGroupViewProps
> = ({ setModalContext, drInfo }) => {
  const { t } = useCustomTranslation();
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState('all');
  const [isOpen, setIsOpen] = React.useState(false);

  const mcvResources = React.useMemo(
    () =>
      drInfo.placementControlInfo.reduce((acc, placementControl) => {
        const clusterName =
          getAnnotations(placementControl)?.[
            LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION
          ];
        const mcvName = `${getName(placementControl)}-${getNamespace(placementControl)}-vrg-mcv`;

        acc[mcvName] = {
          kind: referenceForModel(ACMManagedClusterViewModel),
          namespace: clusterName,
          name: mcvName,
        };
        return acc;
      }, {}),
    [drInfo.placementControlInfo]
  );

  const mcvs = useK8sWatchResources(mcvResources);

  const consistencyGroups: ConsistencyGroupInfo[] = React.useMemo(() => {
    const groups: ConsistencyGroupInfo[] = [];
    Object.values(mcvs).forEach((mcvData) => {
      if (!mcvData.loaded || mcvData.loadError || !mcvData.data) return;

      const mcv = mcvData.data as ACMManagedClusterViewKind;
      const vrg = mcv?.status?.result as DRVolumeReplicationGroupKind;
      if (!vrg) return;

      const cgMap = new Map<
        string,
        {
          type: string;
          pvcs: string[];
          namespace: string;
          lastSyncTime: string;
        }
      >();

      const protectedPVCs = vrg?.status?.protectedPVCs || [];
      protectedPVCs.forEach((pvc) => {
        const cgLabel = Object.entries(pvc.labels || {}).find(
          ([key]) => key === CONSISTENCY_GROUP_LABEL
        );

        if (!cgLabel) return;

        const cgName = cgLabel[1] as string;
        const cgType = getCGType(cgName);

        if (!cgMap.has(cgName)) {
          cgMap.set(cgName, {
            type: cgType,
            pvcs: [],
            namespace: getNamespace(vrg) || '-',
            lastSyncTime: pvc.lastSyncTime,
          });
        }

        const group = cgMap.get(cgName);
        group.pvcs.push(pvc.name);
      });

      cgMap.forEach((value, cgName) => {
        groups.push({
          name: cgName,
          type: value.type as typeof BLOCK | typeof FILESYSTEM,
          namespace: value.namespace,
          state: vrg?.status?.state || 'Unknown',
          lastSyncTime: value.lastSyncTime,
          pvcs: value.pvcs,
        });
      });
    });

    return groups;
  }, [mcvs]);

  const filteredGroups = React.useMemo(
    () => filterGroups(consistencyGroups, searchValue, selectedFilter),
    [consistencyGroups, searchValue, selectedFilter]
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const displayFilterText = {
    all: t('All'),
    block: t('Block'),
    filesystem: t('Filesystem'),
  };

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      className="pf-v5-c-form-control"
      icon={<FilterIcon />}
    >
      {displayFilterText[selectedFilter]}
    </MenuToggle>
  );

  const onSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined
  ) => {
    setSelectedFilter(value as string);
    setIsOpen(false);
  };

  return (
    <>
      <ModalBody>
        <Text component={TextVariants.h3} className="pf-v5-u-mb-md">
          {t('Volume consistency groups')}{' '}
          <FieldLevelHelp position={PopoverPosition.right} popoverHasAutoWidth>
            Placeholder
          </FieldLevelHelp>
        </Text>

        <Flex className="pf-v5-u-mb-lg">
          <FlexItem>
            <Select
              id="single-select"
              isOpen={isOpen}
              selected={selectedFilter}
              onSelect={onSelect}
              onOpenChange={(val) => setIsOpen(val)}
              toggle={toggle}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {FILTERS.map((filter) => (
                  <SelectOption value={filter}>
                    {displayFilterText[filter]}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FlexItem>
          <FlexItem grow={{ default: 'grow' }}>
            <SearchInput
              placeholder={t('Search by name')}
              value={searchValue}
              onChange={(_event, value) => handleSearchChange(value)}
              onClear={() => handleSearchChange('')}
            />
          </FlexItem>
        </Flex>

        <div>
          {filteredGroups.length > 0 ? (
            <>
              {filteredGroups.map((group, index) => (
                <div key={group.name} className="pf-v5-u-mb-lg">
                  <Flex
                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>
                      <Text component={TextVariants.h5}>{group.name}</Text>
                      <Text className="pf-v5-u-color-200">{group.type}</Text>
                    </FlexItem>
                    <FlexItem>
                      <Flex>
                        <FlexItem>
                          <GreenCheckCircleIcon />
                        </FlexItem>
                        <FlexItem>
                          {t('Synced')}, {group.lastSyncTime}
                        </FlexItem>
                      </Flex>
                    </FlexItem>
                  </Flex>

                  <div className="pf-v5-u-mt-md">
                    <Text component={TextVariants.h6}>{t('Namespace')}</Text>
                    <Text>{group.namespace}</Text>
                  </div>

                  <div className="pf-v5-u-mt-md">
                    <Text component={TextVariants.h6}>
                      {t('Persistent volume claims')}
                    </Text>
                    <Text>
                      {group.pvcs.map((pvc, i) => (
                        <FlexItem
                          key={`${pvc}-${i}`}
                          className=" pf-v5-u-mb-sm"
                        >
                          {pvc}
                          {i < group.pvcs.length - 1 ? ',' : ''}
                        </FlexItem>
                      ))}
                      {group.pvcs.length > 7 && (
                        <FlexItem>
                          <Button variant="link" isInline>
                            {t('4 more')}
                          </Button>
                        </FlexItem>
                      )}
                    </Text>
                  </div>

                  {index < filteredGroups.length - 1 && (
                    <Divider className="pf-v5-u-mt-md pf-v5-u-mb-md" />
                  )}
                </div>
              ))}
            </>
          ) : (
            <Text>
              {searchValue
                ? t('No volume consistency groups match your search')
                : t('No volume consistency groups found for this application')}
            </Text>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          variant={ButtonVariant.secondary}
          onClick={() => setModalContext(ModalViewContext.MANAGE_POLICY_VIEW)}
        >
          {t('Go back')}
        </Button>
      </ModalFooter>
    </>
  );
};
