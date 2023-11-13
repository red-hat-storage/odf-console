import {
  ACMManagedClusterViewModel,
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
} from '@odf/mco//models';
import {
  APPLICATION_TYPE,
  DR_SECHEDULER_NAME,
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '@odf/mco/constants';
import { ACMManagedClusterViewKind } from '@odf/mco/types';
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
  k8sGet,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { AssignPolicyViewState } from './reducer';
import { DRPlacementControlType, PlacementType, ViewResponse } from './types';

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
  appType: APPLICATION_TYPE,
  placements: PlacementType[]
) => {
  const { policy, persistentVolumeClaim, dynamicObjects } = state;
  const { recipeInfo, captureInterval } = dynamicObjects;
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
          appType,
          getName(placement),
          getNamespace(placement),
          placement.kind,
          getAPIVersion(placement),
          getName(policy),
          policy.drClusters,
          placement.deploymentClusters,
          labels,
          captureInterval,
          recipeInfo?.name,
          recipeInfo?.namespace
        ),
        cluster: HUB_CLUSTER_NAME,
      })
    );
  });

  return promises;
};

export const pollManagedClusterView = <T extends K8sResourceCommon>(
  viewName: string,
  clusterName: string,
  t: TFunction
): Promise<ViewResponse<T>> => {
  let retries = 20;
  const poll = async (resolve: any, reject: any) => {
    const response: ACMManagedClusterViewKind = await k8sGet({
      model: ACMManagedClusterViewModel,
      name: viewName,
      ns: clusterName,
      cluster: HUB_CLUSTER_NAME,
    });
    if (response?.status) {
      const condition = response.status?.conditions?.[0];
      const { type: isProcessing, reason, message } = condition || {};
      if (isProcessing === 'Processing') {
        reason === 'GetResourceProcessing'
          ? resolve({
              processing: isProcessing,
              reason: reason,
              result: response.status?.result,
            })
          : // Reading is failed
            reject({
              message: message,
            });

        // Delete MCV after reading
        k8sDelete({
          resource: response,
          model: ACMManagedClusterViewModel,
          requestInit: null,
          cluster: HUB_CLUSTER_NAME,
        });
      } else {
        // ACM unale to process the MCV
        reject({
          message: t('There was an error while getting the managed resource.'),
        });
      }
    } else if (retries-- > 0) {
      // eslint-disable-next-line no-console
      console.debug('MCV poll - retries left: ', retries);
      setTimeout(poll, 100, resolve, reject);
    } else {
      k8sDelete({
        resource: response,
        model: ACMManagedClusterViewModel,
        requestInit: null,
        cluster: HUB_CLUSTER_NAME,
      });
      reject({
        message: t(
          'Request for ManagedClusterView: {{viewName}} on cluster: {{clusterName}} failed.',
          { viewName, clusterName }
        ),
      });
    }
  };
  return new Promise(poll);
};
