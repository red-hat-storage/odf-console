import * as React from 'react';

export const LazyDeleteObjectsModal = React.lazy(
  () => import('./DeleteObjectsModal')
);

export const LazyDeleteObjectsSummary = React.lazy(
  () => import('./DeleteObjectsSummary')
);
