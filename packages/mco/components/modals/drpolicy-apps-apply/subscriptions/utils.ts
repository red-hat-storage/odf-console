import { objectify } from '@odf/shared/modals/EditLabelModal';
import {
  getAnnotations,
  getLabels,
  getName,
  getNamespace,
} from '@odf/shared/selectors';
import { getAPIVersionForModel } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  DR_SECHEDULER_NAME,
  HUB_CLUSTER_NAME,
  PROTECTED_APP_ANNOTATION_WO_SLASH,
} from '../../../../constants';
import { PlacementInfoType } from '../../../../hooks';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
  DRPolicyModel,
} from '../../../../models';
import { DRPlacementControlKind } from '../../../../types';

export const getPlacementPatchObj = (placement: PlacementInfoType) => {
  const placementName = getName(placement);
  const placementNamespace = getNamespace(placement);
  if (placement?.kind === ACMPlacementRuleModel.kind) {
    const patch = [
      {
        op: 'replace',
        path: '/spec/schedulerName',
        value: DR_SECHEDULER_NAME,
      },
    ];
    return {
      model: ACMPlacementRuleModel,
      resource: {
        metadata: {
          name: placementName,
          namespace: placementNamespace,
        },
      },
      data: patch,
      cluster: HUB_CLUSTER_NAME,
    };
  } else if (placement?.kind === ACMPlacementModel.kind) {
    const patch = [];
    !_.isEmpty(getAnnotations(placement)) &&
      // will give error otherwise, case when Placement does not have any annotations
      patch.push({ op: 'add', path: '/metadata/annotations', value: {} });
    patch.push({
      op: 'add',
      path: `/metadata/annotations/${PROTECTED_APP_ANNOTATION_WO_SLASH}`,
      value: 'true',
    });
    return {
      model: ACMPlacementModel,
      resource: {
        metadata: {
          name: placementName,
          namespace: placementNamespace,
        },
      },
      data: patch,
      cluster: HUB_CLUSTER_NAME,
    };
  }
};

export const getDRPCCrateObject = (
  placement: PlacementInfoType,
  clusterName: string,
  drPolicyName: string,
  pvcSelectors: string[]
) => {
  const placementName = getName(placement);
  const placementNamespace = getNamespace(placement);
  const drpcObj: DRPlacementControlKind = {
    apiVersion: getAPIVersionForModel(DRPlacementControlModel),
    kind: DRPlacementControlModel.kind,
    metadata: {
      name: `${placementName}-drpc`,
      namespace: placementNamespace,
      labels: getLabels(placement),
    },
    spec: {
      drPolicyRef: {
        name: drPolicyName,
        kind: DRPolicyModel.kind,
        apiVersion: getAPIVersionForModel(DRPolicyModel),
      },
      placementRef: {
        name: placementName,
        kind: placement?.kind,
        namespace: placementNamespace,
        apiVersion: getAPIVersionForModel(ACMPlacementRuleModel),
      },
      preferredCluster: clusterName,
      pvcSelector: {
        matchLabels: objectify(pvcSelectors),
      },
    },
  };
  return {
    model: DRPlacementControlModel,
    data: drpcObj,
    cluster: HUB_CLUSTER_NAME,
  };
};
