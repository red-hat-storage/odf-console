import { SearchResultItemType, SearchQuery } from '@odf/mco/types';
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
import {
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  VirtualMachineModel,
} from '../models';

// Search query
export const searchFilterQuery =
  'query searchResult($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n  }\n}';

export const searchRelatedItemsFilterQuery =
  'query searchResultRelatedItems($input: [SearchInput]) {\n  searchResult: search(input: $input) {\n    items\n    related {\n      kind\n      items\n      __typename\n    }\n    __typename\n  }\n}';

export const queryAppWorkloadPVCs = (
  pvcQueryFilter: PVCQueryFilter
): SearchQuery => ({
  operationName: 'searchResultRelatedItems',
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
  operationName: 'searchResult',
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
  operationName: 'searchResultRelatedItems',
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

// ACM seach query to find managed application resources of the VM.
export const queryManagedApplicationResourcesForVM = (
  names: string[],
  namespace: string,
  cluster: string
): SearchQuery => ({
  operationName: 'searchResultRelatedItems',
  variables: {
    input: [
      {
        filters: [
          {
            property: 'namespace',
            values: [namespace, GITOPS_OPERATOR_NAMESPACE],
          },
          {
            property: 'cluster',
            values: [cluster, HUB_CLUSTER_NAME],
          },
          {
            property: 'kind',
            values: [VirtualMachineModel.kind, 'Application'],
          },
          {
            property: 'name',
            values: names.filter(Boolean),
          },
          {
            property: 'apigroup',
            values: [
              VirtualMachineModel.apiGroup,
              ArgoApplicationSetModel.apiGroup,
            ],
          },
        ],
        relatedKinds: [ACMSubscriptionModel.kind, ArgoApplicationSetModel.kind],
        limit: 2, // search said not to use unlimited results
      },
    ],
  },
  query: searchRelatedItemsFilterQuery,
});
