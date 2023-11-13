import { APPLICATION_TYPE, DRPC_STATUS } from '@odf/mco/constants';
import { DisasterRecoveryFormatted } from '@odf/mco/hooks';
import {
  ACMApplicationKind,
  ACMPlacementType,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '@odf/mco/types';
import { findDRType, isDRPolicyValidated, matchClusters } from '@odf/mco/utils';
import { getLatestDate } from '@odf/shared/details-page/datetime';
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

export const getCurrentStatus = (drpcList: DRPlacementControlType[]): string =>
  drpcList.reduce((acc, drpc) => {
    const status = DRPC_STATUS[drpc.status] || '';
    return [DRPC_STATUS.Relocating, DRPC_STATUS.FailingOver].includes(status)
      ? status
      : acc || status;
  }, '');

export const generateDRPolicyInfo = (
  drPolicy: DRPolicyKind,
  drClusters: DRClusterKind[],
  drpcInfo?: DRPlacementControlType[],
  t?: TFunction
): DRPolicyType[] =>
  !_.isEmpty(drPolicy)
    ? [
        {
          apiVersion: drPolicy.apiVersion,
          kind: drPolicy.kind,
          metadata: drPolicy.metadata,
          assignedOn:
            !!drpcInfo &&
            getLatestDate(
              drpcInfo.map((drpc) => drpc.metadata?.creationTimestamp)
            ),
          activity:
            !!drpcInfo && getCurrentActivity(getCurrentStatus(drpcInfo), t),
          isValidated: isDRPolicyValidated(drPolicy),
          schedulingInterval: drPolicy.spec.schedulingInterval,
          replicationType: findDRType(drClusters),
          drClusters: drPolicy.spec.drClusters,
          placementControlInfo: drpcInfo,
        },
      ]
    : [];

export const generatePlacementInfo = (
  placement: ACMPlacementType,
  deploymentClusters: string[]
): PlacementType => ({
  apiVersion: placement.apiVersion,
  kind: placement.kind,
  metadata: placement.metadata,
  deploymentClusters: deploymentClusters,
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
  appType: APPLICATION_TYPE,
  application: ACMApplicationKind,
  workloadNamespace: string,
  plsInfo: PlacementType[],
  drPolicyInfo: DRPolicyType[]
): ApplicationType => ({
  type: appType,
  apiVersion: application.apiVersion,
  kind: application.kind,
  metadata: application.metadata,
  workloadNamespace: workloadNamespace,
  placements: plsInfo,
  dataPolicies: drPolicyInfo,
});

export const getClusterNamesFromPlacements = (placements: PlacementType[]) =>
  placements?.reduce(
    (acc, placement) => [...acc, ...placement?.deploymentClusters],
    []
  );

export const getMatchingDRPolicies = (
  appInfo: ApplicationType,
  formattedDRResources: DisasterRecoveryFormatted[]
) => {
  const deploymentClusters: string[] = getClusterNamesFromPlacements(
    appInfo.placements
  );

  return (
    // Filter all matching policies
    formattedDRResources?.reduce((acc, resource) => {
      const { drPolicy } = resource;
      return matchClusters(drPolicy?.spec?.drClusters, deploymentClusters)
        ? [
            ...acc,
            ...generateDRPolicyInfo(resource?.drPolicy, resource?.drClusters),
          ]
        : acc;
    }, []) || []
  );
};
