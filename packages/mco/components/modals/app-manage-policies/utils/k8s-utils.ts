import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '@odf/mco//models';
import {
  DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH,
  DR_SECHEDULER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '@odf/mco/constants';
import { DRPlacementControlKind } from '@odf/mco/types';
import { matchClusters } from '@odf/mco/utils';
import { objectify } from '@odf/shared/modals/EditLabelModal';
import {
  getAPIVersion,
  getAnnotations,
  getName,
  getNamespace,
} from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { getAPIVersionForModel } from '@odf/shared/utils';
import {
  k8sDelete,
  k8sPatch,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { AssignPolicyViewState } from './reducer';
import { DRPlacementControlType, PlacementType } from './types';

export const getDRPCKindObj = (
  plsName: string,
  plsNamespace: string,
  plsKind: string,
  plsApiVersion: string,
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
      apiVersion: plsApiVersion,
      kind: plsKind,
    },
    preferredCluster: matchClusters(drClusterNames, decisionClusters),
    pvcSelector: {
      matchLabels: objectify(pvcSelectors),
    },
  },
});

export const doNotDeletePVCAnnotationPromises = (
  drpcs: DRPlacementControlType[]
) => {
  const promises: Promise<K8sResourceKind>[] = [];
  const patch = [
    {
      op: 'add',
      path: `/metadata/annotations/${DO_NOT_DELETE_PVC_ANNOTATION_WO_SLASH}`,
      value: 'true',
    },
  ];
  drpcs.forEach((drpc) => {
    promises.push(
      k8sPatch({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: getName(drpc),
            namespace: getNamespace(drpc),
          },
        },
        data: patch,
      })
    );
  });
  return promises;
};

export const unAssignPromises = (drpcs: DRPlacementControlType[]) => {
  const promises: Promise<K8sResourceKind>[] = [];
  drpcs.forEach((drpc) => {
    promises.push(
      k8sDelete({
        model: DRPlacementControlModel,
        resource: {
          metadata: {
            name: getName(drpc),
            namespace: getNamespace(drpc),
          },
        },
        requestInit: null,
        json: null,
      })
    );
  });
  return promises;
};

const placementAssignPromise = (placement: PlacementType) => {
  const patch = [];
  if (_.isEmpty(getAnnotations(placement))) {
    patch.push({
      op: 'add',
      path: `/metadata/annotations`,
      value: {},
    });
  }
  patch.push({
    op: 'add',
    path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
    value: 'true',
  });
  return k8sPatch({
    model: ACMPlacementModel,
    resource: {
      metadata: {
        name: getName(placement),
        namespace: getNamespace(placement),
      },
    },
    data: patch,
  });
};

const placementRuleAssignPromise = (placement: PlacementType) => {
  return k8sPatch({
    model: ACMPlacementRuleModel,
    resource: {
      metadata: {
        name: getName(placement),
        namespace: getNamespace(placement),
      },
    },
    data: [
      {
        op: 'replace',
        path: '/spec/schedulerName',
        value: DR_SECHEDULER_NAME,
      },
    ],
  });
};

const getPlacement = (placementName: string, placements: PlacementType[]) =>
  placements.find((placement) => getName(placement) === placementName);

export const assignPromises = (
  state: AssignPolicyViewState,
  placements: PlacementType[]
) => {
  const { policy, persistentVolumeClaim } = state;
  const { pvcSelectors } = persistentVolumeClaim;
  const promises: Promise<K8sResourceKind>[] = [];
  pvcSelectors?.forEach((pvcSelector) => {
    const { placementName, labels } = pvcSelector;
    const placement = getPlacement(placementName, placements);
    if (placement.kind === ACMPlacementModel.kind) {
      promises.push(placementAssignPromise(placement));
    } else {
      promises.push(placementRuleAssignPromise(placement));
    }
    promises.push(
      k8sCreate({
        model: DRPlacementControlModel,
        data: getDRPCKindObj(
          getName(placement),
          getNamespace(placement),
          placement.kind,
          getAPIVersion(placement),
          getName(policy),
          policy.drClusters,
          placement.deploymentClusters,
          labels
        ),
      })
    );
  });

  return promises;
};
