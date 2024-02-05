import * as React from 'react';
import { DRClusterAppsMap } from '@odf/mco/types';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';

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
  drClusterAppsMap: DRClusterAppsMap;
  loaded: boolean;
  loadError: any;
};
