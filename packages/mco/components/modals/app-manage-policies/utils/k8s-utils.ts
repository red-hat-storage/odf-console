import { ACMPlacementModel, DRPlacementControlModel } from '@odf/mco//models';
import {
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '@odf/mco/constants';
import { getName, getNamespace } from '@odf/shared/selectors';
import { K8sResourceKind } from '@odf/shared/types';
import { k8sDelete, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { DRPlacementControlType } from './types';

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
