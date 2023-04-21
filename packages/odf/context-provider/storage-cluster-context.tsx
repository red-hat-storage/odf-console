import * as React from 'react';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { OCSStorageClusterModel } from '@odf/shared/models';
import * as _ from 'lodash-es';

export type PluginData = {
  storageClusterName: string | null;
  setStorageClusterName: React.Dispatch<string | null>;
};

export const defaultContext = {
  storageClusterName: null,
  setStorageClusterName: () => {},
};

export const PluginDataContext =
  React.createContext<PluginData>(defaultContext);

export const usePluginDataContextValue = () => {
  // use "useReducer" here and add more control over type of dispatch
  const [storageClusterName, setStorageClusterName] = React.useState(null);
  const [data, loaded, loadError] = useK8sList(
    OCSStorageClusterModel,
    CEPH_STORAGE_NAMESPACE
  );

  console.log('usePluginDataContextValue');
  console.log('usePluginDataContextValue');
  console.log('usePluginDataContextValue');
  console.log('usePluginDataContextValue');

  React.useEffect(() => {
    if (loaded && !loadError && !_.isEmpty(data)) {
      const storageCluster = data.find(
        // @ts-ignore
        (sc) => sc?.status?.phase !== 'Ignored'
      );
      setStorageClusterName(storageCluster?.metadata?.name);
    }
  }, [data, loaded, loadError, setStorageClusterName]);

  const contextValue = React.useMemo(
    () => ({
      storageClusterName,
      setStorageClusterName,
    }),
    [storageClusterName, setStorageClusterName]
  );
  return contextValue;
};

usePluginDataContextValue.context = PluginDataContext;
