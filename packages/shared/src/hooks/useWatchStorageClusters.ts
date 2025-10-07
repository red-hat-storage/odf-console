import { FDF_FLAG } from '@odf/core/redux';
import { RemoteClusterKind } from '@odf/core/types/scale';
import {
  IBMFlashSystemModel,
  RemoteClusterModel,
  StorageClusterModel,
} from '@odf/shared/models';
import { StorageClusterKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceKind,
  useFlag,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { WatchK8sResources } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';

type AllClusters = {
  storageClusters: StorageClusterKind[];
  flashSystemClusters: K8sResourceKind[];
  remoteClusters?: RemoteClusterKind[];
};

const resources = (isFDF: boolean): WatchK8sResources<AllClusters> => ({
  storageClusters: {
    kind: referenceForModel(StorageClusterModel),
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
