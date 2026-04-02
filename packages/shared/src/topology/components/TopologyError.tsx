import * as React from 'react';

export type TopologyErrorProps = {
  error: any;
};

/**
 * Simple error display component for topology views
 */
export const TopologyError: React.FC<TopologyErrorProps> = ({ error }) => (
  <>{error}</>
);
