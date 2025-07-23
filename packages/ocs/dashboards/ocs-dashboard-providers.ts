import * as React from 'react';
import { isExternalCluster, isClusterIgnored } from '@odf/core/utils';
import {
  StorageClusterKind,
  StorageClusterModel,
  getName,
  getNamespace,
  useDeepCompareMemoize,
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

  const filteredStorageClusters = storageClusters?.filter(
    (cluster) => !isClusterIgnored(cluster)
  );
  const memoizedFilteredStorageClusters = useDeepCompareMemoize(
    filteredStorageClusters,
    true
  );

  const [selectedCluster, setSelectedCluster] = React.useState({
    clusterName: '',
    clusterNamespace: '',
    isExternalMode: false,
  });
  React.useEffect(() => {
    if (
      memoizedFilteredStorageClusters?.length > 0 &&
      selectedCluster.clusterName === ''
    ) {
      setSelectedCluster({
        clusterName: getName(memoizedFilteredStorageClusters[0]),
        clusterNamespace: getNamespace(memoizedFilteredStorageClusters[0]),
        isExternalMode: isExternalCluster(memoizedFilteredStorageClusters[0]),
      });
    }
  }, [selectedCluster.clusterName, memoizedFilteredStorageClusters]);

  const switchStorageCluster = React.useCallback(() => {
    if (memoizedFilteredStorageClusters?.length > 1) {
      const currentIndex = memoizedFilteredStorageClusters.findIndex(
        (cluster) => getName(cluster) === selectedCluster.clusterName
      );
      const nextIndex =
        (currentIndex + 1) % memoizedFilteredStorageClusters.length;
      const nextCluster = memoizedFilteredStorageClusters[nextIndex];
      setSelectedCluster({
        clusterName: getName(nextCluster),
        clusterNamespace: getNamespace(nextCluster),
        isExternalMode: isExternalCluster(nextCluster),
      });
    }
  }, [memoizedFilteredStorageClusters, selectedCluster, setSelectedCluster]);

  const currentStorageCluster = memoizedFilteredStorageClusters?.find(
    (cluster) => getName(cluster) === selectedCluster.clusterName
  );

  const hasMultipleStorageClusters =
    memoizedFilteredStorageClusters?.length > 1;
  return {
    hasMultipleStorageClusters,
    selectedCluster,
    switchStorageCluster,
    currentStorageCluster,
  };
};
