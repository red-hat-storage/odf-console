import { FDF_FLAG } from '@odf/core/redux';
import {
  IBMFlashSystemModel,
  RemoteClusterModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { StorageClusterKind } from '@odf/shared/types';
import {
  K8sResourceKind,
  useFlag,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { WatchK8sResources } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';

// @TODO: add IBM Scale System clusters when available.
type AllClusters = {
  storageClusters: StorageClusterKind[];
  flashSystemClusters: K8sResourceKind[];
  remoteClusters?: K8sResourceKind[];
};

const resources = (isFDF: boolean): WatchK8sResources<AllClusters> => ({
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
  ...(isFDF
    ? {
        remoteClusters: {
          groupVersionKind: {
            group: RemoteClusterModel.apiGroup,
            version: RemoteClusterModel.apiVersion,
            kind: RemoteClusterModel.kind,
          },
          isList: true,
        },
      }
    : {}),
});

export const useWatchStorageClusters = () => {
  const isFDF = useFlag(FDF_FLAG);
  return useK8sWatchResources<AllClusters>(resources(isFDF));
};
