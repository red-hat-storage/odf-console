import * as React from 'react';
import { TopologyDataContextType } from './TopologyDataContext';
import { TopologySearchContextType } from './TopologySearchContext';

interface ContextProps<P> {
  context: React.Provider<P>;
  value: P;
}

const combineComponents = (components): React.FC => {
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

export type TopologyContext =
  | ContextProps<TopologyDataContextType>
  | ContextProps<TopologySearchContextType>;

export const TopologyContextProvider = (input: TopologyContext[]) => (
  <>{combineComponents(input)}</>
);
