import { FDF_FLAG } from '@odf/core/redux/provider-hooks';
import { isExternalCluster } from '@odf/core/utils';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { ODFStorageSystem } from '@odf/shared/models';
import {
  StorageClusterKind,
  StorageSystemKind,
  K8sResourceKind,
} from '@odf/shared/types';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import {
  getAnnotations,
  getLabels,
  getName,
  getNamespace,
  getUID,
} from '../selectors';
import { useDeepCompareMemoize } from './deep-compare-memoize';

type ClusterCondition = { type: string; status: string };

const SAN_STORAGE_NAME = 'SAN_Storage';

const getClusterPhase = (cluster: K8sResourceKind): string | undefined => {
  if (cluster?.status?.phase) {
    return cluster.status.phase;
  }
  const conditions = cluster?.status?.conditions;
  if (!conditions?.length) {
    return undefined;
  }
  const readyCondition = conditions.find(
    (c: ClusterCondition) => c.type === 'Ready' || c.type === 'Success'
  );
  if (readyCondition?.status === 'True') {
    return 'Ready';
  }
  const availableCondition = conditions.find(
    (c: ClusterCondition) => c.type === 'Available'
  );
  if (availableCondition?.status === 'True') {
    return 'Ready';
  }
  const failedCondition = conditions.find(
    (c: ClusterCondition) => c.type === 'Failed' || c.type === 'Error'
  );
  if (failedCondition?.status === 'True') {
    return 'Error';
  }
  return 'Pending';
};

type MapClusterOptions = {
  overrideName?: string;
  includeFullMetadata?: boolean;
};

const mapClusterToStorageSystem = (
  cluster: K8sResourceKind,
  options: MapClusterOptions = { includeFullMetadata: true }
): StorageSystemKind => ({
  apiVersion: ODFStorageSystem.apiVersion,
  kind: ODFStorageSystem.kind,
  metadata: {
    name: options.overrideName || getName(cluster),
    namespace: getNamespace(cluster),
    ...(options.includeFullMetadata && {
      uid: getUID(cluster),
      creationTimestamp: cluster.metadata.creationTimestamp,
      resourceVersion: cluster.metadata.resourceVersion,
      annotations: getAnnotations(cluster),
      labels: getLabels(cluster),
    }),
  },
  spec: {
    kind: `${cluster.kind.toLowerCase()}.${cluster.apiVersion}`,
    name: getName(cluster),
    namespace: getNamespace(cluster),
  },
  status: {
    phase: getClusterPhase(cluster),
  },
});

const mapStorageClusterToStorageSystem = (
  storageCluster: K8sResourceKind
): StorageSystemKind => mapClusterToStorageSystem(storageCluster);

const mapSANClusterToStorageSystem = (
  sanCluster: K8sResourceKind
): StorageSystemKind =>
  mapClusterToStorageSystem(sanCluster, {
    overrideName: SAN_STORAGE_NAME,
    includeFullMetadata: false,
  });
/**
 * A facade layer to poll StorageCluster and IBMFlashSystem resources.
 * It should be used where watching of StorageSystem resource is required.
 * StorageSystem resource is a deprecated resource so polling it will not give us any information.
 * @param onlywatchExternalClusters - If true, only watch external clusters.
 *
 * @returns [StorageSystemKind[], boolean, any]
 */
export const useWatchStorageSystems = (
  onlyWatchExternalClusters?: boolean
): [StorageSystemKind[], boolean, any] => {
  const isFDF = useFlag(FDF_FLAG);
  const {
    storageClusters: odfClusters,
    flashSystemClusters,
    remoteClusters: remoteClusterClients,
    sanClusters,
  } = useWatchStorageClusters();

  const loaded =
    odfClusters?.loaded &&
    flashSystemClusters?.loaded &&
    (isFDF ? sanClusters?.loaded : true) &&
    (isFDF ? remoteClusterClients?.loaded : true);
  // Flashsystem loaderror can occur when IBM flashsystem operator is not installed hence ignore it
  const loadError = odfClusters?.loadError;
  const storageClusters: StorageClusterKind[] = onlyWatchExternalClusters
    ? odfClusters?.data?.filter((storagecluster) =>
        isExternalCluster(storagecluster)
      )
    : odfClusters?.data;
  const storageSystems: StorageSystemKind[] =
    odfClusters?.loaded && !odfClusters?.loadError
      ? storageClusters?.map(mapStorageClusterToStorageSystem)
      : [];
  const flashSystems = flashSystemClusters?.data;
  const flashSystemClustersList: StorageSystemKind[] =
    flashSystemClusters?.loaded && !flashSystemClusters?.loadError
      ? flashSystems?.map(mapStorageClusterToStorageSystem)
      : [];
  const remoteClusterClientsData = remoteClusterClients?.data;
  const remoteClusterClientsList: StorageSystemKind[] =
    remoteClusterClients?.loaded && !remoteClusterClients?.loadError
      ? remoteClusterClientsData?.map(mapStorageClusterToStorageSystem)
      : [];
  const sanClustersData = sanClusters?.data;
  const sanClustersList: StorageSystemKind[] =
    sanClusters?.loaded && !sanClusters?.loadError
      ? sanClustersData?.map(mapSANClusterToStorageSystem)
      : [];
  const aggregatedStorageSystems = [
    ...storageSystems,
    ...flashSystemClustersList,
    ...remoteClusterClientsList,
    ...sanClustersList,
  ];
  const memoizedStorageSystems = useDeepCompareMemoize(
    aggregatedStorageSystems,
    true
  );

  return [memoizedStorageSystems, loaded, loadError];
};
