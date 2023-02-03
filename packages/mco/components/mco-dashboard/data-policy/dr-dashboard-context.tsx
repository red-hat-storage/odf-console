import * as React from 'react';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { DrClusterAppsMap } from '../../../types';

export const CSVStatusesContext = React.createContext<CSVStatusesContextType>(
  {} as CSVStatusesContextType
);

export const DRResourcesContext = React.createContext<DRResourcesContextType>(
  {} as DRResourcesContextType
);

type CSVStatusesContextType = {
  csvData: PrometheusResponse;
  csvError: any;
  csvLoading: boolean;
};

type DRResourcesContextType = {
  drClusterAppsMap: DrClusterAppsMap;
  loaded: boolean;
  loadError: any;
};
