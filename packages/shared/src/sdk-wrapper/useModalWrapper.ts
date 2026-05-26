import * as React from 'react';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';

export function useModalWrapper() {
  const launchModal = useModal();
  return React.useCallback(
    (...args: Parameters<typeof launchModal>) => {
      setTimeout(() => {
        launchModal(...args);
      }, 0);
    },
    [launchModal]
  );
}
