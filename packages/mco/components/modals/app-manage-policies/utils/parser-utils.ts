import { DRPC_STATUS } from '@odf/mco/constants';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ArgoApplicationSetKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '@odf/mco/types';
import {
  findDRType,
  getClustersFromPlacementDecision,
  isDRPolicyValidated,
} from '@odf/mco/utils';
import { arrayify } from '@odf/shared/modals/EditLabelModal';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import {
  ApplicationType,
  DRPlacementControlType,
  DRPolicyType,
  PlacementType,
} from './types';

export const getCurrentActivity = (currentStatus: string, t: TFunction) => {
  let status = '';
  if (currentStatus === DRPC_STATUS.Relocating) {
    status = t('Relocate in progress');
  } else if (currentStatus === DRPC_STATUS.FailingOver) {
    status = t('Failover in progress');
  }
  return status;
};

export const generateDRPolicyInfo = (
  t: TFunction,
  drPolicy: DRPolicyKind,
  drClusters: DRClusterKind[],
  drpcInfo?: DRPlacementControlType[]
): DRPolicyType[] =>
  !_.isEmpty(drPolicy)
    ? [
        {
          apiVersion: drPolicy.apiVersion,
          kind: drPolicy.kind,
          metadata: drPolicy.metadata,
          // TODO: For multiple DRPC find least recently created
          assignedOn: drpcInfo?.[0]?.metadata?.creationTimestamp,
          // TODO: For multiple DRPC summarize the activity
          activity: getCurrentActivity(drpcInfo?.[0]?.status, t),
          isValidated: isDRPolicyValidated(drPolicy),
          schedulingInterval: drPolicy.spec.schedulingInterval,
          replicationType: findDRType(drClusters),
          drClusters: drPolicy.spec.drClusters,
          placementControInfo: drpcInfo,
        },
      ]
    : [];

export const generatePlacementInfo = (
  placement: ACMPlacementKind,
  placementDecision: ACMPlacementDecisionKind
): PlacementType => ({
  apiVersion: placement.apiVersion,
  kind: placement.kind,
  metadata: placement.metadata,
  deploymentClusters: getClustersFromPlacementDecision(placementDecision),
});

export const generateDRPlacementControlInfo = (
  drpc: DRPlacementControlKind,
  plsInfo: PlacementType
): DRPlacementControlType[] =>
  !_.isEmpty(drpc)
    ? [
        {
          apiVersion: drpc.apiVersion,
          kind: drpc.kind,
          metadata: drpc.metadata,
          drPolicyRef: drpc.spec.drPolicyRef,
          placementInfo: plsInfo,
          pvcSelector: arrayify(drpc?.spec.pvcSelector.matchLabels) || [],
          lastGroupSyncTime: drpc?.status?.lastGroupSyncTime,
          status: drpc?.status?.phase,
        },
      ]
    : [];

export const generateApplicationInfo = (
  application: ArgoApplicationSetKind,
  workloadNamespace: string,
  plsInfo: PlacementType[],
  drPolicyInfo: DRPolicyType[]
): ApplicationType => ({
  apiVersion: application.apiVersion,
  kind: application.kind,
  metadata: application.metadata,
  workloadNamespace: workloadNamespace,
  placements: plsInfo,
  dataPolicies: drPolicyInfo,
});
