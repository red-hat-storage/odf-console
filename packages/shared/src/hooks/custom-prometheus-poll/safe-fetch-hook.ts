import { useEffect, useRef } from 'react';
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';

export type SafeFetchProps = {
  url: string;
  method?: string;
  options?: RequestInit;
  timeout?: number;
  cluster?: string;
};

export const useSafeFetch = () => {
  const controller = useRef<AbortController>();
  useEffect(() => {
    controller.current = new AbortController();
    return () => controller.current.abort();
  }, []);

  return (props: SafeFetchProps) =>
    consoleFetchJSON(
      props.url,
      props.method || 'get',
      {
        ...(props.options || {}),
        signal: controller.current.signal as AbortSignal,
      },
      props.timeout
    );
};
