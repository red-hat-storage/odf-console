import { objectify } from '@odf/shared/modals/EditLabelModal';
import { K8sResourceKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  k8sPatch,
  k8sCreate,
  k8sDelete,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '../../../constants';
import {
  DRPlacementControlModel,
  ACMPlacementModel,
  DRPolicyModel,
} from '../../../models';
import {
  DRPlacementControlKind,
  PlacementToDrpcMap,
  PlacementToAppSets,
} from '../../../types';
import { matchClusters } from '../../../utils';

export const getDRPCKindObj = (
  plsName: string,
  plsNamespace: string,
  drPolicyName: string,
  drClusterNames: string[],
  decisionClusters: string[],
  pvcSelectors: string[]
): DRPlacementControlKind => ({
  apiVersion: getAPIVersionForModel(DRPlacementControlModel),
  kind: DRPlacementControlModel.kind,
  metadata: {
    name: `${plsName}-drpc`,
    namespace: plsNamespace,
  },
  spec: {
    drPolicyRef: {
      name: drPolicyName,
      apiVersion: getAPIVersionForModel(DRPolicyModel),
      kind: DRPolicyModel.kind,
    },
    placementRef: {
      name: plsName,
      namespace: plsNamespace,
      apiVersion: getAPIVersionForModel(ACMPlacementModel),
      kind: ACMPlacementModel.kind,
    },
    preferredCluster: matchClusters(drClusterNames, decisionClusters),
    pvcSelector: {
      matchLabels: objectify(pvcSelectors),
    },
  },
});

export const areLabelsDifferent = (
  existingLabels: string[],
  updateLabels: string[]
) => {
  if (existingLabels.length !== updateLabels.length) return true;
  const existingLabelsSet: Set<string> = new Set();
  existingLabels.forEach((label) => existingLabelsSet.add(label));
  return updateLabels.some((label) => !existingLabelsSet.has(label));
};

export const getAvailablePanelPromises = (
  availableResource: PlacementToAppSets,
  drpcPvcLabels: PlacementToDrpcMap
) => {
  const availablePanelPromises: Promise<K8sResourceKind>[] = [];

  const patch = [
    {
      op: 'remove',
      path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
    },
  ];

  availableResource.havePlacementAnnotations &&
    availablePanelPromises.push(
      k8sPatch({
        model: ACMPlacementModel,
        resource: {
          metadata: {
            name: availableResource.placement,
            namespace: availableResource.namespace,
          },
        },
        data: patch,
        cluster: HUB_CLUSTER_NAME,
      })
    );
  const drpcName =
    drpcPvcLabels?.[availableResource.namespace]?.[availableResource.placement]
      ?.drpcName;
  !!drpcName &&
    availablePanelPromises.push(
      k8sDelete({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: drpcName,
            namespace: availableResource.namespace,
          },
        },
        requestInit: null,
        json: null,
        cluster: HUB_CLUSTER_NAME,
      })
    );

  return availablePanelPromises;
};

export const getProtectedPanelPromises = (
  drPolicyName: string,
  drClusterNames: string[],
  protectedResource: PlacementToAppSets,
  drpcPvcLabels: PlacementToDrpcMap
) => {
  const protectedPanelPromises: Promise<K8sResourceKind>[] = [];

  const patch = [];
  !protectedResource.havePlacementAnnotations &&
    // will give error otherwise, case when Placement does not have any annotations
    patch.push({ op: 'add', path: '/metadata/annotations', value: {} });
  patch.push({
    op: 'add',
    path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
    value: 'true',
  });

  protectedPanelPromises.push(
    k8sPatch({
      model: ACMPlacementModel,
      resource: {
        metadata: {
          name: protectedResource.placement,
          namespace: protectedResource.namespace,
        },
      },
      data: patch,
      cluster: HUB_CLUSTER_NAME,
    })
  );
  const drpcName =
    drpcPvcLabels?.[protectedResource.namespace]?.[protectedResource.placement]
      ?.drpcName;
  const pvcSelectors =
    drpcPvcLabels?.[protectedResource.namespace]?.[protectedResource.placement]
      ?.updateLabels;
  !drpcName &&
    protectedPanelPromises.push(
      k8sCreate({
        model: DRPlacementControlModel,
        data: getDRPCKindObj(
          protectedResource.placement,
          protectedResource.namespace,
          drPolicyName,
          drClusterNames,
          protectedResource.decisionClusters,
          pvcSelectors
        ),
        cluster: HUB_CLUSTER_NAME,
      })
    );

  return protectedPanelPromises;
};

export const getUpdatedDRPCPromise = (
  protectedResource: PlacementToAppSets,
  drpcPvcLabels: PlacementToDrpcMap
) => {
  const updatedDRPCPromise: Promise<K8sResourceKind>[] = [];

  const drpcName =
    drpcPvcLabels?.[protectedResource.namespace]?.[protectedResource.placement]
      ?.drpcName;
  const updateLabels =
    drpcPvcLabels?.[protectedResource.namespace]?.[protectedResource.placement]
      ?.updateLabels;
  const patch = [
    {
      op: 'replace',
      path: '/spec/pvcSelector/matchLabels',
      value: objectify(updateLabels),
    },
  ];

  !!drpcName &&
    updatedDRPCPromise.push(
      k8sPatch({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: drpcName,
            namespace: protectedResource.namespace,
          },
        },
        data: patch,
        cluster: HUB_CLUSTER_NAME,
      })
    );

  return updatedDRPCPromise;
};
