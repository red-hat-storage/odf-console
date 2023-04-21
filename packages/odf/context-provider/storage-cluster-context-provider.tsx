import * as React from 'react';
import { PluginData, PluginDataContext } from './storage-cluster-context';

export const PluginDataContextProvider = (
  props: React.ProviderProps<PluginData>
) => {
  console.log('PluginDataContextProvider');
  console.log('PluginDataContextProvider');
  console.log('PluginDataContextProvider');
  console.log('PluginDataContextProvider');

  return (
    <PluginDataContext.Provider value={props.value}>
      {props.children}
    </PluginDataContext.Provider>
  );
};
