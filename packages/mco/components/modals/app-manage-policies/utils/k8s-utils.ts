import { ACMPlacementModel, DRPlacementControlModel } from '@odf/mco//models';
import {
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
import { DRPlacementControlType, DataPolicyType } from './types';

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

const placementAssignPromise = (drpc: DRPlacementControlType) => {
  const patch = [];
  if (_.isEmpty(getAnnotations(drpc.placementInfo))) {
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
        name: getName(drpc.placementInfo),
        namespace: getNamespace(drpc.placementInfo),
      },
    },
    data: patch,
    cluster: HUB_CLUSTER_NAME,
  });
};

export const assignPromises = (dataPolicy: DataPolicyType) => {
  const promises: Promise<K8sResourceKind>[] = [];
  const drpcs: DRPlacementControlType[] = dataPolicy.placementControlInfo;
  drpcs?.forEach((drpc) => {
    if (drpc.placementInfo.kind === ACMPlacementModel.kind) {
      promises.push(placementAssignPromise(drpc));
    }
    promises.push(
      k8sCreate({
        model: DRPlacementControlModel,
        data: getDRPCKindObj(
          getName(drpc.placementInfo),
          getNamespace(drpc.placementInfo),
          drpc.placementInfo.kind,
          getAPIVersion(drpc.placementInfo),
          getName(dataPolicy),
          dataPolicy.drClusters,
          drpc.placementInfo.deploymentClusters,
          drpc?.pvcSelector
        ),
        cluster: HUB_CLUSTER_NAME,
      })
    );
  });

  return promises;
};
