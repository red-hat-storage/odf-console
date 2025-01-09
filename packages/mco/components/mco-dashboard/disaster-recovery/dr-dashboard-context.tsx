import * as React from 'react';
import { DRClusterAppsMap } from '@odf/mco/types';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';

export const OperatorStatusesContext =
  React.createContext<OperatorStatusesContextType>(
    {} as OperatorStatusesContextType
  );

export const DRResourcesContext = React.createContext<DRResourcesContextType>(
  {} as DRResourcesContextType
);

type StatusesContextType = {
  data: PrometheusResponse;
  error: any;
  loading: boolean;
};

type OperatorStatusesContextType = {
  csvStatus: StatusesContextType;
  // Alternate way for non CSV operator status monitoring
  podStatus: StatusesContextType;
};

type DRResourcesContextType = {
  drClusterAppsMap: DRClusterAppsMap;
  loaded: boolean;
  loadError: any;
};
