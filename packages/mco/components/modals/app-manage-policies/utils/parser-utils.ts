import {
  DRApplication,
  K8S_RESOURCE_SELECTOR,
  PROTECTED_VMS,
} from '@odf/mco/constants';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
} from '@odf/mco/hooks';
import {
  ACMPlacementType,
  DRPlacementControlKind,
  DRPolicyKind,
} from '@odf/mco/types';
import {
  convertExpressionToLabel,
  getReplicationType,
  isDRPolicyValidated,
  matchClusters,
} from '@odf/mco/utils';
import { getLatestDate } from '@odf/shared/details-page/datetime';
import { arrayify } from '@odf/shared/modals/EditLabelModal';
import {
  K8sResourceCommon,
  Selector,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  ApplicationType,
  DRPlacementControlType,
  DRInfoType,
  PlacementType,
  PVCQueryFilter,
} from './types';

const getPVCSelector = (pvcSelector: Selector): string[] => {
  const { matchLabels, matchExpressions } = pvcSelector;
  return convertExpressionToLabel(matchExpressions) || arrayify(matchLabels);
};

const getDRPolicyInfo = (drPolicy: DRPolicyKind, assignedOn?: string) =>
  !_.isEmpty(drPolicy)
    ? {
        apiVersion: drPolicy.apiVersion,
        kind: drPolicy.kind,
        metadata: drPolicy.metadata,
        isValidated: isDRPolicyValidated(drPolicy),
        schedulingInterval: drPolicy.spec.schedulingInterval,
        replicationType: getReplicationType(drPolicy),
        drClusters: drPolicy.spec.drClusters,
        ...(!!assignedOn ? { assignedOn } : {}),
      }
    : {};

export const generateDRInfo = (
  drPolicy: DRPolicyKind,
  drpcInfo?: DRPlacementControlType[]
): DRInfoType | {} =>
  !_.isEmpty(drPolicy) && !_.isEmpty(drpcInfo)
    ? {
        drPolicyInfo: getDRPolicyInfo(
          drPolicy,
          getLatestDate(
            drpcInfo.map((drpc) => drpc.metadata?.creationTimestamp)
          )
        ),
        placementControlInfo: drpcInfo,
      }
    : {};

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
  plsInfo?: PlacementType
): DRPlacementControlType[] =>
  !_.isEmpty(drpc)
    ? [
        {
          apiVersion: drpc.apiVersion,
          kind: drpc.kind,
          metadata: drpc.metadata,
          drPolicyRef: drpc.spec.drPolicyRef,
          placementInfo: plsInfo,
          pvcSelector: getPVCSelector(drpc.spec.pvcSelector),
          lastGroupSyncTime: drpc.status?.lastGroupSyncTime,
          lastKubeObjectProtectionTime:
            drpc.status?.lastKubeObjectProtectionTime,
          recipeName: drpc.spec?.kubeObjectProtection?.recipeRef?.name,
          recipeNamespace:
            drpc.spec?.kubeObjectProtection?.recipeRef?.namespace,
          vmSharedGroup:
            drpc.spec?.kubeObjectProtection?.recipeParameters?.[
              PROTECTED_VMS
            ] ?? [],
          vmSharedGroupName:
            drpc.spec?.kubeObjectProtection?.recipeParameters?.[
              K8S_RESOURCE_SELECTOR
            ]?.[0] ?? '',
          k8sResourceSyncInterval:
            drpc.spec?.kubeObjectProtection?.captureInterval,
          status: drpc.status,
        },
      ]
    : [];

export const generateApplicationInfo = (
  appType: DRApplication,
  application: K8sResourceCommon,
  workloadNamespace: string,
  plsInfo: PlacementType[],
  drInfo: DRInfoType | {},
  pvcQueryFilter: PVCQueryFilter,
  discoveredVMPVCs?: string[]
): ApplicationType => ({
  type: appType,
  apiVersion: application.apiVersion,
  kind: application.kind,
  metadata: application.metadata,
  workloadNamespace: workloadNamespace,
  placements: plsInfo,
  drInfo: drInfo,
  pvcQueryFilter: pvcQueryFilter,
  discoveredVMPVCs: discoveredVMPVCs,
});

export const getClusterNamesFromPlacements = (placements: PlacementType[]) =>
  placements?.reduce(
    (acc, placement) => [...acc, ...placement?.deploymentClusters],
    []
  );

export const getMatchingDRPolicies = (
  appInfo: ApplicationType,
  drPolicies: DRPolicyKind[]
) => {
  const deploymentClusters: string[] = getClusterNamesFromPlacements(
    appInfo.placements
  );

  return (
    // Filter all matching policies
    drPolicies?.reduce((acc, drPolicy) => {
      return matchClusters(drPolicy?.spec?.drClusters, deploymentClusters)
        ? [...acc, getDRPolicyInfo(drPolicy)]
        : acc;
    }, []) || []
  );
};

export const getDRResources = (namespace: string) => ({
  resources: {
    drPolicies: getDRPolicyResourceObj(),
    drClusters: getDRClusterResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace,
    }),
  },
});
