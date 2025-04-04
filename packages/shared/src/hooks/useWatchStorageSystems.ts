import {
  K8sModel,
  K8sResourceKind,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { WatchK8sResources } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { ODFStorageSystem, StorageClusterModel } from '../models';
import {
  getAnnotations,
  getLabels,
  getName,
  getNamespace,
  getUID,
} from '../selectors';
import { StorageClusterKind, StorageSystemKind } from '../types';
import { useDeepCompareMemoize } from './deep-compare-memoize';

type ResourceObjects = {
  storageClusters: StorageClusterKind[];
  flashSystemClusters: K8sResourceKind[];
};

// To be used only in this one place and not to be exported
const IBMFlashSystemModel: K8sModel = {
  label: 'IBM Flash System',
  labelPlural: 'IBM Flash Systems',
  apiVersion: 'v1alpha1',
  apiGroup: 'odf.ibm.com',
  plural: 'flashsystemclusters',
  abbr: 'FS',
  namespaced: true,
  kind: 'FlashSystemCluster',
  crd: true,
};

const resources: WatchK8sResources<ResourceObjects> = {
  storageClusters: {
    groupVersionKind: {
      group: StorageClusterModel.apiGroup,
      version: StorageClusterModel.apiVersion,
      kind: StorageClusterModel.kind,
    },
    isList: true,
  },
  flashSystemClusters: {
    groupVersionKind: {
      group: IBMFlashSystemModel.apiGroup,
      version: IBMFlashSystemModel.apiVersion,
      kind: IBMFlashSystemModel.kind,
    },
    isList: true,
  },
};

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
    kind: `${storageCluster.kind}.${storageCluster.apiVersion}`,
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
 *
 * @returns [StorageSystemKind[], boolean, any]
 */
export const useWatchStorageSystems = (): [
  StorageSystemKind[],
  boolean,
  any,
] => {
  const { storageClusters: odfClusters, flashSystemClusters } =
    useK8sWatchResources<ResourceObjects>(resources);

  const loaded = odfClusters.loaded && flashSystemClusters.loaded;
  // Flashsystem loaderror can occur when IBM flashsystem operator is not installed hence ignore it
  const loadError = odfClusters.loadError;
  const storageClusters: StorageClusterKind[] = odfClusters.data;
  const storageSystems: StorageSystemKind[] =
    odfClusters?.loaded && !odfClusters.loadError
      ? storageClusters?.map(mapStorageClusterToStorageSystem)
      : [];
  const flashSystems = flashSystemClusters.data;
  const flashSystemClustersList: StorageSystemKind[] =
    flashSystemClusters?.loaded && !flashSystemClusters.loadError
      ? flashSystems?.map(mapStorageClusterToStorageSystem)
      : [];

  const aggregatedStorageSystems = [
    ...storageSystems,
    ...flashSystemClustersList,
  ];
  const memoizedStorageSystems = useDeepCompareMemoize(
    aggregatedStorageSystems,
    true
  );

  return [memoizedStorageSystems, loaded, loadError];
};
