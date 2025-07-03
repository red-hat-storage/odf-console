import * as React from 'react';
import { isExternalCluster } from '@odf/core/utils';
import {
  StorageClusterKind,
  StorageClusterModel,
  getName,
  getNamespace,
} from '@odf/shared';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

type OCSDashboardContextType = {
  hasMultipleStorageClusters: boolean;
  selectedCluster: {
    clusterName: string;
    clusterNamespace: string;
    isExternalMode: boolean;
  };
};

export const OCSDashboardContext = React.createContext<OCSDashboardContextType>(
  {
    hasMultipleStorageClusters: false,
    selectedCluster: {
      clusterName: '',
      clusterNamespace: '',
      isExternalMode: false,
    },
  }
);

type OCSDashboardDispatchContextType = {
  switchStorageCluster: () => void;
};

export const OCSDashboardDispatchContext =
  React.createContext<OCSDashboardDispatchContextType>({
    switchStorageCluster: () => null,
  });

export const useOCSDashboardContextSetter = () => {
  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>({
    groupVersionKind: {
      group: StorageClusterModel.apiGroup,
      version: StorageClusterModel.apiVersion,
      kind: StorageClusterModel.kind,
    },
    isList: true,
  });

  const [selectedCluster, setSelectedCluster] = React.useState({
    clusterName: '',
    clusterNamespace: '',
    isExternalMode: false,
  });
  React.useEffect(() => {
    if (storageClusters?.length > 0 && selectedCluster.clusterName === '') {
      setSelectedCluster({
        clusterName: storageClusters[0].metadata.name,
        clusterNamespace: storageClusters[0].metadata.namespace,
        isExternalMode: isExternalCluster(storageClusters[0]),
      });
    }
  }, [selectedCluster.clusterName, storageClusters]);

  const switchStorageCluster = React.useCallback(() => {
    if (storageClusters?.length > 1) {
      const currentIndex = storageClusters.findIndex(
        (cluster) => getName(cluster) === selectedCluster.clusterName
      );
      const nextIndex = (currentIndex + 1) % storageClusters.length;
      const nextCluster = storageClusters[nextIndex];
      setSelectedCluster({
        clusterName: getName(nextCluster),
        clusterNamespace: getNamespace(nextCluster),
        isExternalMode: isExternalCluster(nextCluster),
      });
    }
  }, [storageClusters, selectedCluster, setSelectedCluster]);

  const currentStorageCluster = storageClusters?.find(
    (cluster) => getName(cluster) === selectedCluster.clusterName
  );

  const hasMultipleStorageClusters = storageClusters?.length > 1;
  return {
    hasMultipleStorageClusters,
    selectedCluster,
    switchStorageCluster,
    currentStorageCluster,
  };
};
