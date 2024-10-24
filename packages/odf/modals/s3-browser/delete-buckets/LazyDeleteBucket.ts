import * as React from 'react';

export const LazyEmptyBucketModal = React.lazy(
  () => import('./EmptyBucketModal')
);
export const LazyDeleteBucketModal = React.lazy(
  () => import('./DeleteBucketModal')
);
