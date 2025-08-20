import { isExternalCluster } from '@odf/core/utils';
import { useWatchStorageClusters } from '@odf/shared/hooks/useWatchStorageClusters';
import { ODFStorageSystem } from '@odf/shared/models';
import { StorageClusterKind, StorageSystemKind } from '@odf/shared/types';
import {
  getAnnotations,
  getLabels,
  getName,
  getNamespace,
  getUID,
} from '../selectors';
import { useDeepCompareMemoize } from './deep-compare-memoize';

const mapStorageClusterToStorageSystem = (
  storageCluster: StorageClusterKind
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
  const {
    storageClusters: odfClusters,
    flashSystemClusters,
    remoteClusters: remoteClusterClients,
  } = useWatchStorageClusters();

  const loaded = odfClusters.loaded && flashSystemClusters.loaded;
  // Flashsystem loaderror can occur when IBM flashsystem operator is not installed hence ignore it
  const loadError = odfClusters.loadError;
  const storageClusters: StorageClusterKind[] = onlyWatchExternalClusters
    ? odfClusters.data.filter((storagecluster) =>
        isExternalCluster(storagecluster)
      )
    : odfClusters.data;
  const storageSystems: StorageSystemKind[] =
    odfClusters?.loaded && !odfClusters.loadError
      ? storageClusters?.map(mapStorageClusterToStorageSystem)
      : [];
  const flashSystems = flashSystemClusters.data;
  const flashSystemClustersList: StorageSystemKind[] =
    flashSystemClusters?.loaded && !flashSystemClusters.loadError
      ? flashSystems?.map(mapStorageClusterToStorageSystem)
      : [];
  const remoteClusterClientsData = remoteClusterClients.data;
  const remoteClusterClientsList: StorageSystemKind[] =
    remoteClusterClients?.loaded && !remoteClusterClients.loadError
      ? remoteClusterClientsData?.map(mapStorageClusterToStorageSystem)
      : [];
  const aggregatedStorageSystems = [
    ...storageSystems,
    ...flashSystemClustersList,
    ...remoteClusterClientsList,
  ];
  const memoizedStorageSystems = useDeepCompareMemoize(
    aggregatedStorageSystems,
    true
  );

  return [memoizedStorageSystems, loaded, loadError];
};
