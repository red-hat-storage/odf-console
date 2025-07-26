import * as React from 'react';
import { CEPH_PROVISIONERS } from '@odf/shared';
import { queryStorageClassesUsingClusterNames } from '../utils';
import { useACMSafeFetch } from './acm-safe-fetch';

export type Provider = { displayName: string; count: number };

export const useStorageProviders = (
  cluster: string
): { providers: Provider[]; count: number; loaded: boolean; error: any } => {
  const searchQuery = React.useMemo(
    () => queryStorageClassesUsingClusterNames([cluster]),
    [cluster]
  );

  const [result, error, loaded] = useACMSafeFetch(searchQuery);

  const maps: any[] = result?.data?.searchResult ?? [];
  const rawItems: Array<{
    storageClassName: string;
    provisioner: string;
  }> = maps[0]?.items ?? [];

  const odfNames = Array.from(
    new Set(
      rawItems
        .filter((i) => CEPH_PROVISIONERS.includes(i.provisioner))
        .map((i) => i.storageClassName)
    )
  );
  const thirdPartyNames = Array.from(
    new Set(
      rawItems
        .filter((i) => !CEPH_PROVISIONERS.includes(i.provisioner))
        .map((i) => i.storageClassName)
    )
  );

  const providers: Provider[] = [];
  if (odfNames.length) {
    providers.push({ displayName: 'Data Foundation', count: odfNames.length });
  }
  thirdPartyNames.forEach((sc) =>
    providers.push({ displayName: sc, count: 1 })
  );

  return {
    providers,
    count: providers.length,
    loaded,
    error,
  };
};
