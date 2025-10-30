import * as React from 'react';
import { ODF_ADMIN, MCG_FLAG } from '@odf/core/features';
import {
  useODFSystemFlagsSelector,
  useODFNamespaceSelector,
} from '@odf/core/redux';
import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';
import {
  useFlag,
  consoleFetchJSON,
} from '@openshift-console/dynamic-plugin-sdk';
import useSWR from 'swr';

type SystemInfoResponse = {
  // ToDo: Placeholder, fix this
  operatorNamespace: string;
  clusterNamespaces: {
    [namespace: string]: {
      ocsClusterName: string;
      isInternalMode: boolean;
      isExternalMode: boolean;
      isRGWAvailable: boolean;
      rgwSecureEndpoint?: string;
    };
  };
};

export type SystemInfoData = SystemInfoResponse['clusterNamespaces'];

type UseSystemInfoResult = {
  data: SystemInfoData | null;
  odfNamespace: string;
  isLoading: boolean;
  error: unknown;
};

export const useSystemInfo = (): UseSystemInfoResult => {
  const isAdmin = useFlag(ODF_ADMIN);
  const isMcg = useFlag(MCG_FLAG);

  // For admin users, use ODF "systemFlags" (since it's already fetched)
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  // For non-admin users, use SWR with conditional polling (since user won't have access to the ODF "systemFlags")
  // Key will be "null" for admin users, preventing SWR from making requests
  const swrKey = !isAdmin
    ? `${ODF_PROXY_ROOT_PATH}/provider-proxy/auth/system-info`
    : null;

  const abortRef = React.useRef<AbortController | null>(null);

  const swrFetcherWithAbort = React.useCallback((url: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return consoleFetchJSON(url, 'get', { signal: controller.signal });
  }, []);

  const {
    data: swrData,
    error: swrError,
    isLoading: swrLoading,
    mutate,
  } = useSWR<SystemInfoResponse>(swrKey, swrFetcherWithAbort, {
    // Poll continuously until "MCG" flag is true, then stop
    refreshInterval: isMcg ? 0 : 5000,
  });

  // Track previous mcgFlag to detect transition
  const prevIsMcg = React.useRef(isMcg);

  // Trigger one last fetch when "MCG" flag flips to true
  // Also abort any previous poll fetch (if any)
  React.useEffect(() => {
    if (isMcg && !isAdmin && prevIsMcg.current !== isMcg) {
      abortRef.current?.abort();
      mutate();
    }
    prevIsMcg.current = isMcg;
  }, [isMcg, isAdmin, mutate]);

  if (isAdmin) {
    return {
      data: systemFlags || null,
      odfNamespace,
      isLoading: !areFlagsLoaded || !isODFNsLoaded,
      error: flagsLoadError || odfNsLoadError,
    };
  }

  return {
    data: swrData?.clusterNamespaces || null,
    odfNamespace: swrData?.operatorNamespace || odfNamespace,
    isLoading: swrLoading,
    error: swrError,
  };
};
