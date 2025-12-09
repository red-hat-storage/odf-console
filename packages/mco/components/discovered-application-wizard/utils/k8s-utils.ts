import {
  DISCOVERED_APP_NS,
  PROTECTED_APP_ANNOTATION,
} from '@odf/mco/constants';
import {} from '@odf/mco/types';
import { ACMPlacementKind, DRPlacementControlKind } from '@odf/mco/types';
import {
  ACMPlacementModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  MatchExpression,
  ObjectMetadata,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  EnrollDiscoveredApplicationState,
  ProtectionMethodType,
} from './reducer';

export const convertRecipeParamsToList = (
  params: Record<string, string> = {}
): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(params).map(([k, val]) => [
      k.trim(),
      val
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ])
  );

export const getDRPCKindObj = (props: {
  name: string;
  preferredCluster: string;
  namespaces: string[];
  protectionMethod: ProtectionMethodType;
  drPolicyName: string;
  k8sResourceReplicationInterval: string;
  recipeName?: string;
  recipeNamespace?: string;
  recipeParameters?: Record<string, string[]>;
  k8sResourceLabelExpressions?: MatchExpression[];
  pvcLabelExpressions?: MatchExpression[];
  placementName: string;
  labels?: ObjectMetadata['labels'];
}): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: props.name,
    namespace: DISCOVERED_APP_NS,
    ...(props.labels && { labels: props.labels }),
  },
  spec: {
    preferredCluster: props.preferredCluster,
    protectedNamespaces: props.namespaces,
    pvcSelector: !!props.pvcLabelExpressions.length
      ? {
          matchExpressions: props.pvcLabelExpressions,
        }
      : {},
    kubeObjectProtection: {
      captureInterval: props.k8sResourceReplicationInterval,
      ...(props.protectionMethod === ProtectionMethodType.RECIPE
        ? {
            recipeRef: {
              name: props.recipeName,
              namespace: props.recipeNamespace,
            },
            recipeParameters: props.recipeParameters ?? {},
          }
        : {
            kubeObjectSelector: {
              matchExpressions: props.k8sResourceLabelExpressions,
            },
          }),
    },
    drPolicyRef: {
      name: props.drPolicyName,
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
    },
    placementRef: {
      name: props.placementName,
      namespace: DISCOVERED_APP_NS,
      apiVersion: getAPIVersionForModel(ACMPlacementModel),
      kind: ACMPlacementModel.kind,
    },
  },
});

// Dummy placement for the discovered apps DRPC
export const getPlacementKindObj = (
  placementName: string
): ACMPlacementKind => ({
  apiVersion: getAPIVersionForModel(ACMPlacementModel),
  kind: ACMPlacementModel.kind,
  metadata: {
    name: placementName,
    namespace: DISCOVERED_APP_NS,
    annotations: {
      [PROTECTED_APP_ANNOTATION]: 'true',
    },
  },
  spec: {
    predicates: [],
  },
});

export const createPromise = (
  state: EnrollDiscoveredApplicationState
): Promise<K8sResourceKind>[] => {
  const { namespace, configuration, replication } = state;
  const { clusterName, namespaces, name } = namespace;
  const { protectionMethod, recipe, resourceLabels } = configuration;
  const { recipeName, recipeNamespace, recipeParameters } = recipe;
  const { k8sResourceLabelExpressions, pvcLabelExpressions } = resourceLabels;
  const { drPolicy, k8sResourceReplicationInterval } = replication;
  const namespaceList = namespaces.map(getName);
  // Placement naming format is similar to the ACM console.
  // Using the same postfix will prevent the UI from creating multiple placement for the same app.
  const placementName = `${name}-placement-1`;

  const promises: Promise<K8sResourceKind>[] = [];
  promises.push(
    k8sCreate({
      model: ACMPlacementModel,
      data: getPlacementKindObj(placementName),
    })
  );

  promises.push(
    k8sCreate({
      model: DRPlacementControlModel,
      data: getDRPCKindObj({
        name,
        preferredCluster: clusterName,
        namespaces: namespaceList,
        protectionMethod,
        recipeName,
        recipeNamespace,
        recipeParameters: convertRecipeParamsToList(recipeParameters),
        k8sResourceLabelExpressions,
        pvcLabelExpressions,
        drPolicyName: getName(drPolicy),
        k8sResourceReplicationInterval,
        placementName,
      }),
    })
  );
  return promises;
};
