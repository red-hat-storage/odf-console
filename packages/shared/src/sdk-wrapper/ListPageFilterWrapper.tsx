import * as React from 'react';
import {
  ListPageFilter,
  type ListPageFilterProps,
} from '@openshift-console/dynamic-plugin-sdk';
import { ErrorBoundary } from '../error-boundary/ErrorBoundary';

export const ListPageFilterWrapper: React.FC<ListPageFilterProps> = (props) => (
  <ErrorBoundary>
    <ListPageFilter {...props} />
  </ErrorBoundary>
);

ListPageFilterWrapper.displayName = 'ListPageFilterWrapper';
