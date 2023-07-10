import { SearchQuery } from '@odf/mco/types';

export const queryAppWorkloadPVCs = (
  workloadNamespace: string,
  clusterNames: string[]
): SearchQuery => ({
  operationName: 'searchResult',
  variables: {
    input: [
      {
        filters: [
          {
            property: 'kind',
            values: ['persistentvolumeclaim'],
          },
          {
            property: 'namespace',
            values: [workloadNamespace],
          },
          {
            property: 'cluster',
            values: clusterNames,
          },
        ],
        limit: 20,
      },
    ],
  },
  query:
    'query searchResult($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n  }\n}',
});
