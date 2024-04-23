import {
  ACMPlacementModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '@odf/mco//models';
import {
  DISCOVERED_APP_NS,
  PROTECTED_APP_ANNOTATION,
} from '@odf/mco/constants';
import {
  ACMPlacementKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '@odf/mco/types';
import { getName } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
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
  placementName: string;
}): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: props.name,
    namespace: DISCOVERED_APP_NS,
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
          }
        : {
            kubeObjectSelector: {
              matchExpressions: props.k8sResourceLabelExpressions,
            },
          }),
    },
    drPolicyRef: {
      name: getName(props.drPolicy),
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
const getPlacementKindObj = (placementName: string): ACMPlacementKind => ({
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
  const { recipeName, recipeNamespace } = recipe;
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
        k8sResourceLabelExpressions,
        pvcLabelExpressions,
        drPolicy,
        k8sResourceReplicationInterval,
        placementName,
      }),
    })
  );
  return promises;
};
