import { SearchResultItemType, SearchQuery } from '@odf/mco/types';
import {
  K8sResourceCommon,
  ObjectMetadata,
} from '@openshift-console/dynamic-plugin-sdk';
import { LABELS_SPLIT_CHAR, LABEL_SPLIT_CHAR } from '../constants';

// Search query
export const searchFilterQuery =
  'query searchResult($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n  }\n}';

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
        limit: 20, // search said not to use unlimited results
      },
    ],
  },
  query: searchFilterQuery,
});

export const queryNamespacesUsingCluster = (
  clusterName: string
): SearchQuery => ({
  operationName: 'searchResult',
  variables: {
    input: [
      {
        filters: [
          {
            property: 'kind',
            values: ['namespace'],
          },
          {
            property: 'cluster',
            values: clusterName,
          },
        ],
        limit: 20000, // search said not to use unlimited results
      },
    ],
  },
  query: searchFilterQuery,
});

// Only some metadata information are coverted
export const convertSearchResultToK8sResourceCommon = (
  searchResultItems: SearchResultItemType[]
): K8sResourceCommon[] =>
  searchResultItems.map((item) => {
    const resourceName = item.name;
    // example labels: "key1:value1;key2=value2"
    const labelList: string[] = item.label?.split(LABELS_SPLIT_CHAR) || [];
    const labels: ObjectMetadata['labels'] = labelList.reduce((acc, label) => {
      const [key, value] = label.split(LABEL_SPLIT_CHAR);
      acc[key] = value;
      return acc;
    }, {});
    return {
      apiVersion: item.apigroup
        ? `${item.apigroup}/${item.apiversion}`
        : item.apiversion,
      kind: item.kind,
      metadata: {
        name: resourceName,
        namespace: item.namespace,
        creationTimestamp: item.created,
        uid: item._uid, // managedClusterName/uuid
        labels,
      },
      status: {
        cluster: item.cluster,
        resourceName,
      },
    };
  });
