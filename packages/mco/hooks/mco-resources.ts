import { ApplicationModel } from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';
import { Selector } from '@openshift-console/dynamic-plugin-sdk';
import { HUB_CLUSTER_NAME, PLACEMENT_REF_LABEL } from '../constants';
import {
  ACMManagedClusterModel,
  ACMPlacementDecisionModel,
  ACMPlacementModel,
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
  ArgoApplicationSetModel,
  DRClusterModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '../models';

export const getDRClusterResourceObj = (props?: ClusterScopeObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  kind: referenceForModel(DRClusterModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: false,
  optional: true,
});

export const getDRPolicyResourceObj = (props?: ClusterScopeObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  kind: referenceForModel(DRPolicyModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: false,
  optional: true,
});

export const getManagedClusterResourceObj = (
  props?: ClusterScopeObjectType
) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  kind: referenceForModel(ACMManagedClusterModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: false,
  optional: true,
});

export const getDRPlacementControlResourceObj = (
  props?: NamespacedObjectType
) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(DRPlacementControlModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? false : true,
  optional: true,
});

export const getApplicationSetResourceObj = (props?: NamespacedObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ArgoApplicationSetModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
});

export const getPlacementResourceObj = (props?: NamespacedObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ACMPlacementModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
});

export const getPlacementDecisionsResourceObj = (
  props?: NamespacedObjectType
) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ACMPlacementDecisionModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
  ...(!!props?.selector ? { selector: props?.selector } : {}),
});

export const getPlacementRuleResourceObj = (props?: NamespacedObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ACMPlacementRuleModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
});

export const getSubscriptionResourceObj = (props?: NamespacedObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ACMSubscriptionModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
});

export const getApplicationResourceObj = (props?: NamespacedObjectType) => ({
  cluster: HUB_CLUSTER_NAME,
  ...(!!props?.name ? { name: props?.name } : {}),
  ...(!!props?.namespace ? { namespace: props?.namespace } : {}),
  kind: referenceForModel(ApplicationModel),
  ...(!props?.name ? { isList: true } : {}),
  namespaced: !!props?.namespace ? true : false,
  optional: true,
});

// Common watch object for dr resources
export const getDRResources = (namespace?: string) => ({
  drClusters: getDRClusterResourceObj(),
  drPolicies: getDRPolicyResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj({
    ...(!!namespace ? { namespace } : {}),
  }),
});

// Common watch object for placements
export const getPlacementResources = (
  namespace?: string,
  placementName?: string
) => ({
  placements: getPlacementResourceObj({
    ...(!!namespace ? { namespace } : {}),
    ...(!!placementName ? { name: placementName } : {}),
  }),
  placementDecisions: getPlacementDecisionsResourceObj({
    ...(!!namespace ? { namespace } : {}),
    ...(!!placementName
      ? { selector: { matchLabels: { [PLACEMENT_REF_LABEL]: placementName } } }
      : {}),
  }),
});

// Common watch object for argo app sets
export const getArgoAppSetResources = (
  namespace?: string,
  placementName?: string
) => ({
  // application to find sibling applications
  applications: getApplicationSetResourceObj({
    ...(!!namespace ? { namespace } : {}),
  }),
  ...getPlacementResources(namespace, placementName),
});

type ClusterScopeObjectType = {
  name?: string;
  selector?: Selector;
};

type NamespacedObjectType = ClusterScopeObjectType & {
  namespace?: string;
};
