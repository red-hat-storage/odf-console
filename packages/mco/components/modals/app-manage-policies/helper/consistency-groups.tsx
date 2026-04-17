import * as React from 'react';
import {
  APP_NAMESPACE_ANNOTATION,
  CONSISTENCY_GROUP_LABEL,
  ReplicationType,
  VolumeReplicationHealth,
} from '@odf/mco/constants';
import {
  ACMManagedClusterViewKind,
  DRPlacementControlKind,
  DRVolumeReplicationGroupKind,
} from '@odf/mco/types';
import { getReplicationHealth } from '@odf/mco/utils';
import {
  ACMManagedClusterViewModel,
  getAnnotations,
  getName,
  GreenCheckCircleIcon,
  ModalBody,
  RedExclamationCircleIcon,
  StatusBox,
  useCustomTranslation,
} from '@odf/shared';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  WatchK8sResultsObject,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  Divider,
  Flex,
  FlexItem,
  SearchInput,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import { DRPlacementControlType } from '../utils/types';

export type ConsistencyGroupInfo = {
  name: string;
  namespace: string;
  lastSyncTime: string;
  pvcs: string[];
  synced: boolean;
};

export type WatchResourceType = {
  [key in string]: ACMManagedClusterViewKind;
};

const filterGroups = (groups: ConsistencyGroupInfo[], searchValue: string) => {
  const lowerSearch = searchValue.toLowerCase();
  const matchesSearch = (text: string) =>
    text.toLowerCase().includes(lowerSearch);
  return groups.filter(({ name, namespace, pvcs }) =>
    [name, namespace, ...pvcs].some(matchesSearch)
  );
};

const GroupInfo: React.FC<GroupInfoProps> = ({ group, t }) => (
  <Flex
    justifyContent={{ default: 'justifyContentSpaceBetween' }}
    alignItems={{ default: 'alignItemsCenter' }}
  >
    <FlexItem>
      <Text component={TextVariants.h5}>
        {t('Group name: {{ groupName }}', { groupName: group.name })}
      </Text>
    </FlexItem>
    {group.synced ? (
      <FlexItem>
        <GreenCheckCircleIcon /> {t('Synced')}, {group.lastSyncTime}
      </FlexItem>
    ) : (
      <FlexItem>
        <RedExclamationCircleIcon /> {t('Sync failed')}, {group.lastSyncTime}
      </FlexItem>
    )}
  </Flex>
);

const NamespaceInfo: React.FC<NamespaceInfoProps> = ({ t, namespace }) => {
  return (
    <div className="pf-v5-u-mt-md">
      <Text component={TextVariants.h6}>{t('Namespace')}</Text>
      <Text>{namespace}</Text>
    </div>
  );
};

const PVCList: React.FC<PVCInfoProps> = ({ pvcs, t }) => {
  const [showAll, setShowAll] = React.useState(false);
  const maxVisiblePVCs = 7;
  const hasMorePVCs = pvcs.length > maxVisiblePVCs;
  const remainingCount = pvcs.length - maxVisiblePVCs;

  const visiblePVCs = showAll ? pvcs : pvcs.slice(0, maxVisiblePVCs);

  return (
    <div className="pf-v5-u-mt-md">
      <Text component={TextVariants.h6}>{t('Persistent volume claims')}</Text>
      <Text component={TextVariants.p}>
        {visiblePVCs.join(', ')}
        {hasMorePVCs && (
          <>
            {' '}
            <Button
              variant={ButtonVariant.link}
              onClick={() => setShowAll((prev) => !prev)}
              isInline
              className="pf-v5-u-ml-sm"
            >
              {showAll
                ? t('Show less')
                : t('{{count}} more', { count: remainingCount })}
            </Button>
          </>
        )}
      </Text>
    </div>
  );
};

const GroupCard: React.FC<GroupCardProps> = ({ group, isLast, t }) => (
  <div key={group.name} className="pf-v5-u-mb-lg">
    <GroupInfo group={group} t={t} />
    <NamespaceInfo namespace={group.namespace} t={t} />
    <PVCList pvcs={group.pvcs} t={t} />
    {!isLast && <Divider className="pf-v5-u-mt-md pf-v5-u-mb-md" />}
  </div>
);

const GroupList: React.FC<GroupListProps> = ({ filteredGroups, t }) => (
  <div>
    {filteredGroups.length > 0 ? (
      filteredGroups.map((group, index) => (
        <GroupCard
          key={group.name}
          group={group}
          isLast={index === filteredGroups.length - 1}
          t={t}
        />
      ))
    ) : (
      <Text>{t('No volume consistency groups match your search')}</Text>
    )}
  </div>
);

const NoConsistencyGroups: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Text className="pf-v5-u-text-align-center pf-v5-u-mt-lg">
      {t('No volume consistency groups found for this application')}
    </Text>
  );
};

export const ConsistencyGroupsContent: React.FC<
  ConsistencyGroupsContentProps
> = ({ consistencyGroups, loaded, loadError }) => {
  const { t } = useCustomTranslation();
  const [searchValue, setSearchValue] = React.useState('');

  const filteredGroups = React.useMemo(
    () => filterGroups(consistencyGroups, searchValue),
    [consistencyGroups, searchValue]
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  return (
    <ModalBody>
      <StatusBox
        loaded={loaded}
        loadError={loadError}
        EmptyMsg={NoConsistencyGroups}
        data={consistencyGroups}
      >
        <Text component={TextVariants.h3} className="pf-v5-u-mb-md">
          {t('Volume consistency groups')}
        </Text>

        <Flex className="pf-v5-u-mb-lg">
          <FlexItem grow={{ default: 'grow' }}>
            <SearchInput
              placeholder={t(
                'Search by group name, PVC name, or PVC namespace'
              )}
              value={searchValue}
              onChange={(_event, value) => handleSearchChange(value)}
              onClear={() => handleSearchChange('')}
            />
          </FlexItem>
        </Flex>

        <GroupList filteredGroups={filteredGroups} t={t} />
      </StatusBox>
    </ModalBody>
  );
};

const buildConsistencyGroupMap = (
  vrg: DRVolumeReplicationGroupKind
): Map<string, ConsistencyGroupInfo> => {
  const cgMap = new Map<string, ConsistencyGroupInfo>();
  const protectedPVCs = vrg.status?.protectedPVCs || [];

  protectedPVCs.forEach((pvc) => {
    const cgLabel = Object.entries(pvc.labels || {}).find(
      ([key]) => key === CONSISTENCY_GROUP_LABEL
    );
    if (!cgLabel) return;

    const cgName = cgLabel[1] as string;
    const schedulingInterval = vrg.spec.async?.schedulingInterval;
    const dataLastSyncedOn = pvc.lastSyncTime;
    const healthStatus = getReplicationHealth(
      dataLastSyncedOn || '',
      schedulingInterval,
      ReplicationType.ASYNC
    );
    const isSynced = healthStatus === VolumeReplicationHealth.HEALTHY;

    // Use composite key to support consistency groups across multiple namespaces
    const cgKey = `${pvc.namespace}/${cgName}`;

    if (!cgMap.has(cgKey)) {
      cgMap.set(cgKey, {
        name: cgName,
        pvcs: [],
        namespace: pvc.namespace,
        lastSyncTime: pvc.lastSyncTime,
        synced: isSynced,
      });
    }

    cgMap.get(cgKey).pvcs.push(pvc.name);
  });

  return cgMap;
};

const convertCGMapToGroups = (cgMap: Map<string, ConsistencyGroupInfo>) => {
  const groups = [];
  cgMap.forEach((value, _) => {
    groups.push({
      name: value.name,
      namespace: value.namespace,
      lastSyncTime: value.lastSyncTime,
      pvcs: value.pvcs,
      synced: value.synced,
    });
  });
  return groups;
};

const extractVRGFromMCV = (mcvData): DRVolumeReplicationGroupKind | null =>
  mcvData.data?.status?.result as DRVolumeReplicationGroupKind;

export const extractConsistencyGroups = (mcvs: {
  [key in string]: WatchK8sResultsObject<K8sResourceCommon>;
}): { loaded: boolean; loadError: any; data: ConsistencyGroupInfo[] } => {
  let allLoaded = true;
  let anyError = '';
  const groups: ConsistencyGroupInfo[] = [];

  Object.values(mcvs).forEach((mcvData) => {
    if (mcvData.loadError && !anyError) {
      anyError = mcvData.loadError;
    }

    if (!mcvData.loaded) {
      allLoaded = false;
    }

    if (!mcvData.loaded || mcvData.loadError || !mcvData.data) return;

    const vrg = extractVRGFromMCV(mcvData);
    if (!vrg) return;

    const cgMap = buildConsistencyGroupMap(vrg);
    const vrgGroups = convertCGMapToGroups(cgMap);
    groups.push(...vrgGroups);
  });

  return {
    loaded: allLoaded,
    loadError: anyError,
    data: groups,
  };
};

export const getMCVName = (
  resource: DRPlacementControlKind | DRPlacementControlType
): string => {
  const annotations = getAnnotations(resource, {});
  const ns = annotations[APP_NAMESPACE_ANNOTATION] ?? '';
  return `${getName(resource)}-${ns}-vrg-mcv`;
};

export const buildMCVResource = (clusterName: string, mcvName: string) => {
  return {
    kind: referenceForModel(ACMManagedClusterViewModel),
    namespace: clusterName,
    name: mcvName,
  };
};

export type ConsistencyGroupsContentProps = {
  consistencyGroups: ConsistencyGroupInfo[];
  namespace?: string;
  loaded: boolean;
  loadError: any;
};

type GroupInfoProps = {
  group: ConsistencyGroupInfo;
  t: TFunction<string>;
};

type NamespaceInfoProps = {
  namespace: string;
  t: TFunction<string>;
};

type PVCInfoProps = {
  pvcs: string[];
  t: TFunction<string>;
};

type GroupCardProps = {
  group: ConsistencyGroupInfo;
  isLast: boolean;
  t: TFunction<string>;
};

type GroupListProps = {
  filteredGroups: ConsistencyGroupInfo[];
  t: TFunction<string>;
};
