import * as React from 'react';

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
