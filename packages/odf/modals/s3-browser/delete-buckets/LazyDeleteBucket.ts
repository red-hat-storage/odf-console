import * as React from 'react';

export const LazyEmptyBucketModal = React.lazy(
  () => import('./EmptyBucketModal')
);
