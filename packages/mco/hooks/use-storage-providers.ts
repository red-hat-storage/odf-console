import { SearchQuery } from '@odf/mco/types';
import { useACMSafeFetch } from './acm-safe-fetch';

const ODF_PROVISIONER_PREFIX = 'ocs-storagecluster-ceph';

export type Provider = { displayName: string; count: number };

export const useStorageProviders = (
  cluster: string
): { providers: Provider[]; count: number; loaded: boolean; error: any } => {
  const searchQuery: SearchQuery = {
    operationName: 'searchStorageClasses',
    variables: {
      input: [
        {
          filters: [
            { property: 'kind', values: ['StorageClass'] },
            { property: 'cluster', values: [cluster] },
          ],
          limit: 1000,
        },
      ],
    },
    query: `
      query searchStorageClasses($input: [SearchInput]) {
        searchResult: search(input: $input) {
          items
        }
      }
    `,
  };

  const [result, error, loaded] = useACMSafeFetch(searchQuery);

  const maps: any[] = result?.data?.searchResult ?? [];
  const rawItems: Array<{
    storageClassName: string;
    provisioner: string;
  }> = maps[0]?.items ?? [];

  const odfNames = Array.from(
    new Set(
      rawItems
        .filter((i) => i.provisioner.startsWith(ODF_PROVISIONER_PREFIX))
        .map((i) => i.storageClassName)
    )
  );
  const thirdPartyNames = Array.from(
    new Set(
      rawItems
        .filter((i) => !i.provisioner.startsWith(ODF_PROVISIONER_PREFIX))
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
