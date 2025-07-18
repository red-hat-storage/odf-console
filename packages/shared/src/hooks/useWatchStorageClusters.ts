import { IBMFlashSystemModel, StorageClusterModel } from '@odf/shared/models';
import { StorageClusterKind } from '@odf/shared/types';
import {
  K8sResourceKind,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { WatchK8sResources } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';

// @TODO: add IBM Scale System clusters when available.
type AllClusters = {
  storageClusters: StorageClusterKind[];
  flashSystemClusters: K8sResourceKind[];
};

const resources: WatchK8sResources<AllClusters> = {
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

export const useWatchStorageClusters = () =>
  useK8sWatchResources<AllClusters>(resources);
