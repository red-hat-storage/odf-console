import * as React from 'react';
import { LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION } from '@odf/mco/constants';
import {
  ACMManagedClusterViewKind,
  DRVolumeReplicationGroupKind,
} from '@odf/mco/types';
import {
  getAnnotations,
  getName,
  getNamespace,
  useCustomTranslation,
} from '@odf/shared';
import { ModalBody, ModalFooter } from '@odf/shared/modals';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Button,
  ButtonVariant,
  Text,
  TextVariants,
  Flex,
  FlexItem,
  Divider,
  SearchInput,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { ACMManagedClusterViewModel } from '../../../models';
import { ModalViewContext } from './utils/reducer';
import { DRInfoType } from './utils/types';

type VolumeConsistencyGroupViewProps = {
  setModalContext: (context: ModalViewContext) => void;
  drInfo?: DRInfoType;
};

type ConsistencyGroupInfo = {
  name: string;
  type: 'Block' | 'Filesystem';
  namespace: string;
  state: string;
  lastSyncTime: string;
  pvcs: string[];
};

export const VolumeConsistencyGroupView: React.FC<
  VolumeConsistencyGroupViewProps
> = ({ setModalContext, drInfo }) => {
  const { t } = useCustomTranslation();
  const [searchValue, setSearchValue] = React.useState('');
  const [selectedFilter, setSelectedFilter] = React.useState('all');

  const [mcv, mcvsLoaded, mcvsLoadError] =
    useK8sWatchResource<ACMManagedClusterViewKind>({
      kind: referenceForModel(ACMManagedClusterViewModel),
      namespace: getAnnotations(drInfo.placementControlInfo[0])?.[
        LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION
      ],
      name:
        getName(drInfo.placementControlInfo[0]) +
        '-' +
        getNamespace(drInfo.placementControlInfo[0]) +
        '-vrg-mcv',
    });

  const consistencyGroups: ConsistencyGroupInfo[] = React.useMemo(() => {
    if (!mcvsLoaded || mcvsLoadError || !mcv) {
      return [];
    }

    const groups: ConsistencyGroupInfo[] = [];
    const vrg = mcv?.status?.result as DRVolumeReplicationGroupKind;

    if (!vrg) {
      return [];
    }
    const cgMap = new Map<
      string,
      {
        type: string;
        pvcs: string[];
        namespace: string;
      }
    >();
    const protectedPVCs = vrg?.status?.protectedPVCs || [];
    protectedPVCs.forEach((pvc) => {
      const cgLabel = Object.entries(pvc.labels || {}).find(
        ([key]) => key === 'ramendr.openshift.io/consistency-group'
      );

      if (!cgLabel) return;

      const cgName = cgLabel[1] as string;
      const cgType = cgName.startsWith('cephfs-') ? 'Filesystem' : 'Block';

      if (!cgMap.has(cgName)) {
        cgMap.set(cgName, {
          type: cgType,
          pvcs: [],
          namespace: vrg?.metadata?.namespace || '-',
        });
      }

      const group = cgMap.get(cgName);
      group.pvcs.push(pvc.name);
    });

    cgMap.forEach((value, cgName) => {
      groups.push({
        name: cgName,
        type: value.type as 'Block' | 'Filesystem',
        namespace: value.namespace,
        state: vrg?.status?.state || 'Unknown',
        lastSyncTime: vrg?.status?.lastGroupSyncTime || '-',
        pvcs: value.pvcs,
      });
    });

    return groups;
  }, [mcv, mcvsLoaded, mcvsLoadError]);

  const filteredGroups = React.useMemo(() => {
    let filtered = consistencyGroups;

    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.name.toLowerCase().includes(lowerSearch) ||
          group.namespace.toLowerCase().includes(lowerSearch) ||
          group.pvcs.some((pvc) => pvc.toLowerCase().includes(lowerSearch))
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(
        (group) => group.type.toLowerCase() === selectedFilter.toLowerCase()
      );
    }

    return filtered;
  }, [consistencyGroups, searchValue, selectedFilter]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  return (
    <>
      <ModalBody>
        <Text component={TextVariants.h2} className="pf-v5-u-mb-md">
          {t('Volume consistency groups')}{' '}
          <Button
            variant="plain"
            aria-label="Help"
            className="pf-v5-u-ml-sm pf-v5-u-display-inline-flex"
            isInline
          >
            ?
          </Button>
        </Text>

        <Flex className="pf-v5-u-mb-lg">
          <FlexItem>
            <Flex>
              <FlexItem>
                <FilterIcon className="pf-v5-u-mr-sm" />
              </FlexItem>
              <FlexItem>
                <Button
                  variant={selectedFilter === 'all' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedFilter('all')}
                  className="pf-v5-u-mr-sm"
                >
                  {t('All')}
                </Button>
                <Button
                  variant={selectedFilter === 'block' ? 'primary' : 'secondary'}
                  onClick={() => setSelectedFilter('block')}
                  className="pf-v5-u-mr-sm"
                >
                  {t('Block')}
                </Button>
                <Button
                  variant={
                    selectedFilter === 'filesystem' ? 'primary' : 'secondary'
                  }
                  onClick={() => setSelectedFilter('filesystem')}
                >
                  {t('Filesystem')}
                </Button>
              </FlexItem>
            </Flex>
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
                      <Text component={TextVariants.h3}>{group.name}</Text>
                      <Text className="pf-v5-u-color-200">{group.type}</Text>
                    </FlexItem>
                    <FlexItem>
                      {/* {group.syncStatus === 'Synced' ? (
                        <Flex>
                          <FlexItem>
                            <CheckCircleIcon className="pf-v5-u-success-color-100" />
                          </FlexItem>
                          <FlexItem>
                            {t('Synced')}, {group.lastSyncTime}
                          </FlexItem>
                        </Flex>
                      ) : (
                        <Flex>
                          <FlexItem>
                            <ExclamationCircleIcon className="pf-v5-u-danger-color-100" />
                          </FlexItem>
                          <FlexItem>
                            {t('Sync failed')}, {group.lastSyncTime}
                          </FlexItem>
                        </Flex>
                      )} */}
                    </FlexItem>
                  </Flex>

                  <div className="pf-v5-u-mt-md">
                    <Text component={TextVariants.h4}>{t('Namespace')}</Text>
                    <Text>{group.namespace}</Text>
                  </div>

                  <div className="pf-v5-u-mt-md">
                    <Text component={TextVariants.h4}>
                      {t('Persistent volume claims')}
                    </Text>
                    <Flex className="pf-v5-u-mt-md">
                      {group.pvcs.map((pvc, i) => (
                        <FlexItem
                          key={`${pvc}-${i}`}
                          className="pf-v5-u-mr-md pf-v5-u-mb-sm"
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
                    </Flex>
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
