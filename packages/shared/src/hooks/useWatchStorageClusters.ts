import { FDF_FLAG } from '@odf/core/redux';
import {
  ClusterKind,
  DaemonKind,
  RemoteClusterKind,
} from '@odf/core/types/scale';
import {
  ClusterModel,
  DaemonModel,
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
  sanClusters?: ClusterKind[];
  daemons?: DaemonKind[];
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
        sanClusters: {
          groupVersionKind: {
            group: ClusterModel.apiGroup,
            version: ClusterModel.apiVersion,
            kind: ClusterModel.kind,
          },
          isList: true,
        },
        daemons: {
          groupVersionKind: {
            group: DaemonModel.apiGroup,
            version: DaemonModel.apiVersion,
            kind: DaemonModel.kind,
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
