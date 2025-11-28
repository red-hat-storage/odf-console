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

const mapStorageClusterToStorageSystem = (
  storageCluster: K8sResourceKind
): StorageSystemKind => ({
  apiVersion: ODFStorageSystem.apiVersion,
  kind: ODFStorageSystem.kind,
  metadata: {
    name: getName(storageCluster),
    namespace: getNamespace(storageCluster),
    uid: getUID(storageCluster),
    creationTimestamp: storageCluster.metadata.creationTimestamp,
    resourceVersion: storageCluster.metadata.resourceVersion,
    annotations: getAnnotations(storageCluster),
    labels: getLabels(storageCluster),
  },
  spec: {
    kind: `${storageCluster.kind.toLowerCase()}.${storageCluster.apiVersion}`,
    name: getName(storageCluster),
    namespace: getNamespace(storageCluster),
  },
  status: {
    phase: storageCluster?.status?.phase,
  },
});

const mapSANClusterToStorageSystem = (
  sanCluster: K8sResourceKind
): StorageSystemKind => ({
  apiVersion: ODFStorageSystem.apiVersion,
  kind: ODFStorageSystem.kind,
  metadata: {
    name: 'SAN_Storage',
    namespace: getNamespace(sanCluster),
  },
  spec: {
    kind: `${sanCluster.kind.toLowerCase()}.${sanCluster.apiVersion}`,
    name: getName(sanCluster),
    namespace: getNamespace(sanCluster),
  },
  status: {
    phase: sanCluster?.status?.phase,
  },
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
