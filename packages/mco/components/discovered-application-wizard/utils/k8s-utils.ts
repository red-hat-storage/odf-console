import { DRPlacementControlModel, DRPolicyModel } from '@odf/mco//models';
import { RAMEN_PROTECTED_APPS_NAMESPACE } from '@odf/mco/constants';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { getName } from '@odf/shared/selectors';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  MatchExpression,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  EnrollDiscoveredApplicationState,
  ProtectionMethodType,
} from './reducer';

export const getDRPCKindObj = (props: {
  name: string;
  preferredCluster: string;
  namespaces: string[];
  protectionMethod: ProtectionMethodType;
  drPolicy: DRPolicyKind;
  k8sResourceReplicationInterval: string;
  recipeName?: string;
  recipeNamespace?: string;
  k8sResourceLabelExpressions?: MatchExpression[];
  pvcLabelExpressions?: MatchExpression[];
}): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: props.name,
    namespace: RAMEN_PROTECTED_APPS_NAMESPACE,
  },
  spec: {
    preferredCluster: props.preferredCluster,
    eligibleForProtectionNamespaces: props.namespaces,
    pvcSelector: !!props.pvcLabelExpressions.length
      ? {
          matchExpressions: props.pvcLabelExpressions,
        }
      : {},
    ...(!!props.k8sResourceLabelExpressions.length
      ? {
          kubeObjectSelector: {
            matchExpressions: props.pvcLabelExpressions,
          },
        }
      : {}),
    kubeObjectProtection: {
      captureInterval: props.k8sResourceReplicationInterval,
      ...(props.protectionMethod === ProtectionMethodType.RECIPE
        ? {
            recipeRef: {
              name: props.recipeName,
              namespace: props.recipeNamespace,
            },
          }
        : {}),
    },
    drPolicyRef: {
      name: getName(props.drPolicy),
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
    },
  },
});

export const createPromise = (state: EnrollDiscoveredApplicationState) => {
  const { namespace, configuration, replication } = state;
  const { clusterName, namespaces, name } = namespace;
  const { protectionMethod, recipe, resourceLabels } = configuration;
  const { recipeName, recipeNamespace } = recipe;
  const { k8sResourceLabelExpressions, pvcLabelExpressions } = resourceLabels;
  const { drPolicy, k8sResourceReplicationInterval } = replication;
  const namespaceList = namespaces.map(getName);

  return k8sCreate({
    model: DRPlacementControlModel,
    data: getDRPCKindObj({
      name,
      preferredCluster: clusterName,
      namespaces: namespaceList,
      protectionMethod,
      recipeName,
      recipeNamespace,
      k8sResourceLabelExpressions,
      pvcLabelExpressions,
      drPolicy,
      k8sResourceReplicationInterval,
    }),
  });
};
