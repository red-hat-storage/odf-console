import * as React from 'react';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { DrClusterAppsMap } from '../../../types';

export const CSVStatusesContext = React.createContext<CSVStatusesContextType>(
  {} as CSVStatusesContextType
);

export const DRResourcesContext = React.createContext<DRResourcesContextType>(
  {} as DRResourcesContextType
);

export type CSVStatusesContextType = {
  csvData: PrometheusResponse;
  csvError: any;
  csvLoading: boolean;
};

export type DRResourcesContextType = {
  drClusterAppsMap: DrClusterAppsMap;
  loaded: boolean;
  loadError: any;
};

interface ContextProps<P> {
  context: React.Provider<P>;
  value: P;
}

export type DRContext =
  | ContextProps<CSVStatusesContextType>
  | ContextProps<DRResourcesContextType>;

export const combineComponents = (components): React.FC => {
  return components.reduce(
    (AccumulatedComponents, { context: CurrentComponent, value }) => {
      return ({ children }: React.ComponentProps<React.FC>): JSX.Element => {
        return (
          <AccumulatedComponents>
            <CurrentComponent value={value}>{children}</CurrentComponent>
          </AccumulatedComponents>
        );
      };
    },
    ({ children }) => <>{children}</>
  );
};

export const AppContextProvider = (input: DRContext[]) => (
  <>{combineComponents(input)}</>
);
