import * as React from 'react';

export const LazyClientCorsConfigModal = React.lazy(
  () => import('./ClientCorsConfigModal')
);
