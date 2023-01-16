import * as React from 'react';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { ArgoApplicationSetResourceKind } from '../../../hooks';

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
  argoApplicationSetResources: ArgoApplicationSetResourceKind[];
  loaded: boolean;
  loadError: any;
};
