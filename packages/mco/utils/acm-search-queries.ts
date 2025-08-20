import { SearchResultItemType, SearchQuery } from '@odf/mco/types';
import {
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  VirtualMachineModel,
} from '@odf/shared';
import {
  K8sResourceCommon,
  ObjectMetadata,
} from '@openshift-console/dynamic-plugin-sdk';
import { PVCQueryFilter } from '../components/modals/app-manage-policies/utils/types';
import {
  GITOPS_OPERATOR_NAMESPACE,
  HUB_CLUSTER_NAME,
  LABELS_SPLIT_CHAR,
  LABEL_SPLIT_CHAR,
} from '../constants';

// Search query names
const SEARCH_RELATED_ITEMS_QUERY_NAME = 'searchResultRelatedItems';
const SEARCH_QUERY_NAME = 'searchResult';

// Search query
export const searchFilterQuery =
  'query searchResult($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n  }\n}';

export const searchRelatedItemsFilterQuery =
  'query searchResultRelatedItems($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n    related {\n      kind\n      items\n      __typename\n    }\n    __typename\n  }\n}';

export const queryAppWorkloadPVCs = (
  pvcQueryFilter: PVCQueryFilter
): SearchQuery => ({
  operationName: SEARCH_RELATED_ITEMS_QUERY_NAME,
  variables: {
    input: [
      {
        filters: pvcQueryFilter,
        relatedKinds: ['persistentvolumeclaim'],
        limit: 100, // search said not to use unlimited results
      },
    ],
  },
  query: searchRelatedItemsFilterQuery,
});

export const queryNamespacesUsingCluster = (
  clusterName: string
): SearchQuery => ({
  operationName: SEARCH_QUERY_NAME,
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

export const queryStorageClassesUsingClusterNames = (
  clusterNames: string[]
): SearchQuery => ({
  operationName: SEARCH_QUERY_NAME,
  variables: {
    input: [
      {
        filters: [
          {
            property: 'kind',
            values: 'storageclass',
          },
          {
            property: 'cluster',
            values: clusterNames,
          },
        ],
        limit: 200, // restricting results to a limit
      },
    ],
  },
  query: searchFilterQuery,
});

export const convertSearchResult = (
  result: SearchResultItemType
): K8sResourceCommon => {
  const resourceName = result.name;
  // example labels: "key1:value1;key2=value2"
  const labelList: string[] = result.label?.split(LABELS_SPLIT_CHAR) || [];
  const labels: ObjectMetadata['labels'] = labelList.reduce((acc, label) => {
    const [key, value] = label.split(LABEL_SPLIT_CHAR);
    acc[key] = value;
    return acc;
  }, {});
  return {
    apiVersion: result.apigroup
      ? `${result.apigroup}/${result.apiversion}`
      : result.apiversion,
    kind: result.kind,
    metadata: {
      name: resourceName,
      namespace: result.namespace,
      creationTimestamp: result.created,
      uid: result._uid, // managedClusterName/uuid
      labels,
    },
    status: {
      cluster: result.cluster,
      resourceName,
    },
  } as K8sResourceCommon;
};

// Only some metadata information are coverted
export const convertSearchResultToK8sResourceCommon = (
  searchResultItems: SearchResultItemType[]
): K8sResourceCommon[] => searchResultItems.map(convertSearchResult);

export const queryRecipesFromCluster = (
  clusterName: string,
  namespaces: string[]
): SearchQuery => ({
  operationName: SEARCH_QUERY_NAME,
  variables: {
    input: [
      {
        filters: [
          {
            property: 'kind',
            values: 'recipe',
          },
          {
            property: 'apigroup',
            values: ['ramendr.openshift.io'],
          },
          {
            property: 'namespace',
            values: namespaces,
          },
          {
            property: 'cluster',
            values: clusterName,
          },
        ],
        limit: 20, // search said not to use unlimited results
      },
    ],
  },
  query: searchFilterQuery,
});

// ACM seach query to fetch all releated resources of this namespaces from the managed cluster.
export const queryK8sResourceFromCluster = (
  clusterName: string,
  namespaces: string[]
): SearchQuery => ({
  operationName: SEARCH_RELATED_ITEMS_QUERY_NAME,
  variables: {
    input: [
      {
        filters: [
          {
            property: 'namespace',
            values: namespaces,
          },
          {
            property: 'cluster',
            values: clusterName,
          },
        ],
        limit: 2000, // search said not to use unlimited results
      },
    ],
  },
  query: searchRelatedItemsFilterQuery,
});

// ACM seach query to find ApplicationSet resources of the VM.
export const queryApplicationSetResourcesForVM = (
  argoApplicationName: string
): SearchQuery => ({
  operationName: SEARCH_RELATED_ITEMS_QUERY_NAME,
  variables: {
    input: [
      {
        filters: [
          {
            property: 'namespace',
            // namespace where gitops operator is installed
            values: GITOPS_OPERATOR_NAMESPACE,
          },
          {
            property: 'cluster',
            values: HUB_CLUSTER_NAME,
          },
          {
            property: 'kind',
            // Finding ApplicationSet using Argo Application
            values: 'Application',
          },
          {
            property: 'name',
            // Argo Application name
            values: argoApplicationName,
          },
          {
            property: 'apigroup',
            // Argo Application api group argoproj.io
            values: ArgoApplicationSetModel.apiGroup,
          },
        ],
        relatedKinds: [ArgoApplicationSetModel.kind],
        limit: 3, // search said not to use unlimited results
      },
    ],
  },
  query: searchRelatedItemsFilterQuery,
});

// ACM seach query to find Subscription resources of the VM.
export const querySubscriptionResourcesForVM = (
  vmName: string,
  vmNamespace: string,
  cluster: string
): SearchQuery => ({
  operationName: SEARCH_RELATED_ITEMS_QUERY_NAME,
  variables: {
    input: [
      {
        filters: [
          {
            property: 'namespace',
            values: vmNamespace,
          },
          {
            property: 'cluster',
            values: cluster,
          },
          // VirtualMachine kind
          {
            property: 'kind',
            values: VirtualMachineModel.kind,
          },
          // VirtualMachine name
          {
            property: 'name',
            values: vmName,
          },
          // VirtualMachine api group
          {
            property: 'apigroup',
            values: VirtualMachineModel.apiGroup,
          },
        ],
        // subscription kind
        relatedKinds: [ACMSubscriptionModel.kind],
        limit: 2, // search said not to use unlimited results
      },
    ],
  },
  query: searchRelatedItemsFilterQuery,
});
