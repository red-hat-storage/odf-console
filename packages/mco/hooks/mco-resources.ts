import { ApplicationModel } from '@odf/shared/models';
import { referenceForModel } from '@odf/shared/utils';
import { HUB_CLUSTER_NAME } from '../constants';
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

type ClusterScopeObjectType = {
  name?: string;
};

type NamespacedObjectType = ClusterScopeObjectType & {
  namespace?: string;
};
