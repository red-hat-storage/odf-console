import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
} from '@odf/mco//models';
import {
  DR_SECHEDULER_NAME,
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '@odf/mco/constants';
import { getDRPCKindObj } from '@odf/mco/utils';
import {
  getAPIVersion,
  getAnnotations,
  getName,
  getNamespace,
} from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import {
  k8sDelete,
  k8sPatch,
  k8sCreate,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { AssignPolicyViewState } from './reducer';
import { DRPlacementControlType, PlacementType } from './types';

export const placementUnAssignPromise = (drpc: DRPlacementControlType) => {
  const patch = [
    {
      op: 'remove',
      path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
    },
  ];
  return k8sPatch({
    model: ACMPlacementModel,
    resource: {
      metadata: {
        name: getName(drpc?.placementInfo),
        namespace: getNamespace(drpc?.placementInfo),
      },
    },
    data: patch,
    cluster: HUB_CLUSTER_NAME,
  });
};

export const unAssignPromises = (drpcs: DRPlacementControlType[]) => {
  const promises: Promise<K8sResourceKind>[] = [];

  drpcs?.forEach((drpc) => {
    if (drpc?.placementInfo?.kind === ACMPlacementModel.kind) {
      promises.push(placementUnAssignPromise(drpc));
    }
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
        cluster: HUB_CLUSTER_NAME,
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
    cluster: HUB_CLUSTER_NAME,
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
    cluster: HUB_CLUSTER_NAME,
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
        cluster: HUB_CLUSTER_NAME,
      })
    );
  });

  return promises;
};
