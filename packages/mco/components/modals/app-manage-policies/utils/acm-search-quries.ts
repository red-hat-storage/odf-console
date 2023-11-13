import { SearchQuery } from '@odf/mco/types';

// ACM search query to fetch metadata of any CR from managed cluster.
export const queryResourceKind = (
  kind: string,
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
            values: [kind],
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
        limit: 50,
      },
    ],
  },
  query:
    'query searchResult($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n  }\n}',
});

// ACM seach query to fetch all releated resources of this application from the managed cluster.
// isNamesapceWideSearch is used to restric the search to application specific or namesapce wide.
export const queryAppResources = (
  appName: string,
  workLoadNamespace: string,
  clusterNames: string[],
  isNamesapceWideSearch: boolean
): SearchQuery => ({
  operationName: 'searchResultRelatedItems',
  variables: {
    input: [
      {
        filters: [
          ...(!isNamesapceWideSearch
            ? [
                {
                  property: 'label',
                  values: [
                    `app=${appName}`,
                    `app.kubernetes.io/part-of=${appName}`,
                  ],
                },
              ]
            : []),
          {
            property: 'namespace',
            values: [workLoadNamespace],
          },
          {
            property: 'cluster',
            values: clusterNames,
          },
        ],
        limit: 200,
      },
    ],
  },
  query:
    'query searchResultRelatedItems($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n    related {\n      kind\n      items\n      __typename\n    }\n    __typename\n  }\n}',
});
