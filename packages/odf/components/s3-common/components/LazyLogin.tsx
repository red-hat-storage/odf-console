import * as React from 'react';

export const LazyLoginForm = React.lazy(() => import('./LoginForm'));

export const LazyLoginModal = React.lazy(() => import('./LoginModal'));
