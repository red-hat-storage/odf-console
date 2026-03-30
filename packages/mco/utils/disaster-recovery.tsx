import * as React from 'react';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRVolumeReplicationGroup,
  K8sResourceConditionStatus,
} from '@odf/shared';
import {
  daysToSeconds,
  getTimeDifferenceInSeconds,
  hoursToSeconds,
  minutesToSeconds,
} from '@odf/shared/details-page/datetime';
import {
  getLabel,
  hasLabel,
  getName,
  getNamespace,
  getAnnotations,
} from '@odf/shared/selectors';
import { K8sResourceCondition } from '@odf/shared/types';
import { ApplicationKind } from '@odf/shared/types/k8s';
import {
  K8sResourceCommon,
  GreenCheckCircleIcon,
  Alert,
  AlertStates,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  Operator,
  MatchExpression,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { InProgressIcon, UnknownIcon } from '@patternfly/react-icons';
import { DRPlacementControlType } from '../components/modals/app-manage-policies/utils/types';
import {
  VolumeReplicationHealth,
  DR_SECHEDULER_NAME,
  THRESHOLD,
  DRActionType,
  LABEL_SPLIT_CHAR,
  LABELS_SPLIT_CHAR,
  DR_BLOCK_LISTED_LABELS,
  PLACEMENT_RULE_REF_LABEL,
  MCV_NAME_TEMPLATE,
  NAME_NAMESPACE_SPLIT_CHAR,
  LEAST_SECONDS_IN_PROMETHEUS,
  VALIDATED,
} from '../constants';
import {
  DRPC_NAMESPACE_ANNOTATION,
  DRPC_NAME_ANNOTATION,
  ReplicationType,
  TimeUnits,
  PROTECTED_APP_ANNOTATION,
  PLACEMENT_REF_LABEL,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
} from '../constants';
import { DisasterRecoveryFormatted } from '../hooks';
import { DRPlacementControlConditionType, Phase } from '../types';
import {
  ACMSubscriptionKind,
  ACMPlacementRuleKind,
  DRPlacementControlKind,
  DRPolicyKind,
  DRClusterKind,
  ACMManagedClusterKind,
  ACMManagedClusterViewKind,
  DRVolumeReplicationGroupKind,
  ProtectedPVCData,
  ProtectedAppsMap,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  MirrorPeerKind,
  ArgoApplicationSetKind,
  SearchResultItemType,
  ACMPlacementType,
  SearchResult,
} from '../types';

export type PlacementMap = {
  [placementUniqueId: string]: string;
};

export type SubscriptionMap = {
  [placementUniqueId: string]: string[];
};

export type ApplicationDRInfo = {
  drPlacementControl: DRPlacementControlKind;
  subscriptions: string[];
  clusterName: string; // current placement cluster
};

export type DRPolicyMap = {
  [policyName: string]: DRPlacementControlKind[];
};

export const isMinimumSupportedODFVersion = (
  odfVersion: string,
  requiredODFVersion: string
): boolean =>
  odfVersion.localeCompare(requiredODFVersion, undefined, {
    numeric: true,
    sensitivity: 'base',
  }) >= 0;

const isSubscriptionInApplication = (
  subscription: ACMSubscriptionKind,
  expr: MatchExpression,
  match: Boolean
) =>
  match
    ? expr?.values?.includes(getLabel(subscription, expr?.key))
    : !expr?.values?.includes(getLabel(subscription, expr?.key));

const isApplicationInSubscription = (
  subscription: ACMSubscriptionKind,
  expr: MatchExpression,
  match: Boolean
) =>
  match
    ? hasLabel(subscription?.metadata?.labels, expr?.key) &&
      !Array.isArray(expr?.values)
    : !hasLabel(subscription?.metadata?.labels, expr?.key) &&
      !Array.isArray(expr?.values);

export const matchApplicationToSubscription = (
  subscription: ACMSubscriptionKind,
  application: ApplicationKind
): boolean => {
  // applying subscription filter from application
  const valid = application?.spec?.selector?.matchExpressions?.every((expr) => {
    switch (expr?.operator) {
      case Operator.In:
        return isSubscriptionInApplication(subscription, expr, true);
      case Operator.NotIn:
        return isSubscriptionInApplication(subscription, expr, false);
      case Operator.Exists:
        return isApplicationInSubscription(subscription, expr, true);
      case Operator.DoesNotExist:
        return isApplicationInSubscription(subscription, expr, false);
      default:
        return false;
    }
  });
  return valid;
};

export const getPlacementUniqueId = (name: string, namespace: string, kind) =>
  `${name}%${namespace}%${kind}`;

export const generateUniquePlacementMap = (
  placementRules: ACMPlacementRuleKind[],
  placements: ACMPlacementKind[],
  placementDecisions: ACMPlacementDecisionKind[]
): PlacementMap => {
  let placementMap: PlacementMap = placementRules?.reduce(
    (acc, plsRule) =>
      plsRule?.spec?.schedulerName === DR_SECHEDULER_NAME
        ? {
            ...acc,
            [getPlacementUniqueId(
              getName(plsRule),
              getNamespace(plsRule),
              plsRule?.kind
            )]: plsRule?.status?.decisions?.[0]?.clusterName || '',
          }
        : acc,
    {}
  );

  placementMap = placements?.reduce((acc, pls) => {
    const placementDecision = findPlacementDecisionUsingPlacement(
      pls,
      placementDecisions
    );
    acc = !!getAnnotations(pls)?.[PROTECTED_APP_ANNOTATION]
      ? {
          ...acc,
          [getPlacementUniqueId(getName(pls), getNamespace(pls), pls?.kind)]:
            placementDecision?.status?.decisions?.[0]?.clusterName || '',
        }
      : acc;
    return acc;
  }, placementMap);

  return placementMap;
};

export const isPlacementModel = (subscription: ACMSubscriptionKind) =>
  [ACMPlacementRuleModel?.kind, ACMPlacementModel?.kind].includes(
    getPlacementKind(subscription)
  );

export const filterDRSubscriptions = (
  application: ApplicationKind,
  subscriptions: ACMSubscriptionKind[],
  placementMap: PlacementMap
): SubscriptionMap =>
  subscriptions?.reduce((acc, subscription) => {
    const placementRef = subscription?.spec?.placement?.placementRef;
    const uniqueId = getPlacementUniqueId(
      placementRef?.name,
      placementRef?.namespace || getNamespace(application),
      placementRef?.kind
    );
    const subsMap =
      isPlacementModel(subscription) &&
      placementMap?.hasOwnProperty(uniqueId) &&
      matchApplicationToSubscription(subscription, application)
        ? {
            ...acc,
            [uniqueId]: [...(acc[uniqueId] || []), getName(subscription)],
          }
        : acc;
    return subsMap;
  }, {});

export const getAppDRInfo = (
  drPlacementControls: DRPlacementControlKind[],
  subscriptionMap: SubscriptionMap,
  placementMap: PlacementMap
): ApplicationDRInfo[] =>
  drPlacementControls?.reduce((acc, drPlacementControl) => {
    const placementRef = drPlacementControl?.spec?.placementRef;
    const uniqueId = getPlacementUniqueId(
      placementRef?.name,
      placementRef?.namespace || getNamespace(drPlacementControl),
      placementRef?.kind
    );
    return subscriptionMap?.hasOwnProperty(uniqueId)
      ? [
          ...acc,
          {
            drPlacementControl: drPlacementControl,
            subscriptions: subscriptionMap?.[uniqueId],
            clusterName:
              placementMap?.[uniqueId] ||
              getLastAppDeploymentClusterName(drPlacementControl),
          },
        ]
      : acc;
  }, []);

export const getDRPolicyName = (drpc: DRPlacementControlKind) =>
  drpc?.spec?.drPolicyRef?.name;

export const getDRPoliciesCount = (drPolicies: DRPolicyMap) =>
  Object.keys(drPolicies || {})?.length;

export const getReplicationType = (drPolicy: DRPolicyKind): ReplicationType => {
  const status = drPolicy?.status;

  // Primary logic: Use replication type based on status if available
  // RDR
  if (!_.isEmpty(status?.['async'])) return ReplicationType.ASYNC;
  // MDR
  if (!_.isEmpty(status?.['sync'])) return ReplicationType.SYNC;

  // Fallback logic: Use schedulingInterval to determine type
  const isAsync = drPolicy?.spec?.schedulingInterval !== '0m';
  return isAsync ? ReplicationType.ASYNC : ReplicationType.SYNC;
};

export const getReplicationHealth = (
  lastSyncTime: string,
  schedulingInterval: string,
  replicationType?: ReplicationType
): VolumeReplicationHealth => {
  if (replicationType && replicationType === ReplicationType.SYNC) {
    return VolumeReplicationHealth.HEALTHY;
  }
  const seconds = !!lastSyncTime
    ? getTimeDifferenceInSeconds(lastSyncTime)
    : LEAST_SECONDS_IN_PROMETHEUS;
  return getVolumeReplicationHealth(seconds, schedulingInterval)[0];
};

export const getPlacementKind = (subscription: ACMSubscriptionKind) =>
  subscription?.spec?.placement?.placementRef?.kind;

export const getClusterNamesFromMirrorPeers = (
  mirrorPeers: MirrorPeerKind[],
  clusterName: string
): string[] => {
  const peerClusters = mirrorPeers.reduce((acc, mirrorPeer) => {
    const clusters = mirrorPeer.spec.items?.map(
      ({ clusterName: peerClusterName }) => peerClusterName
    );
    return clusters.includes(clusterName) ? [...acc, ...clusters] : acc;
  }, []);

  return Array.from(new Set(peerClusters));
};

export const isPeerReady = (drpc: DRPlacementControlKind) =>
  !!drpc?.status?.conditions?.some(
    (condition) =>
      condition?.type === 'PeerReady' && condition?.status === 'True'
  );

export const isDRPCAvailable = (drpc: DRPlacementControlKind) =>
  !!drpc?.status?.conditions?.some(
    (condition) =>
      condition?.type === 'Available' && condition?.status === 'True'
  );

export const checkDRActionReadiness = (
  drpc: DRPlacementControlKind,
  drAction: DRActionType
) =>
  isPeerReady(drpc) &&
  (drAction === DRActionType.RELOCATE ? isDRPCAvailable(drpc) : true);

export const findCluster = (
  clusters: K8sResourceCommon[],
  matchClusterName: string,
  matchCluster = false
) =>
  clusters?.find((cluster) =>
    matchCluster
      ? getName(cluster) === matchClusterName
      : getName(cluster) !== matchClusterName
  );

export const findDRResourceUsingPlacement = (
  placementName: string,
  workloadNamespace: string,
  drResources: DisasterRecoveryFormatted[],
  placementKind: string = ACMPlacementModel.kind
): DisasterRecoveryFormatted => {
  let result: DisasterRecoveryFormatted = {};
  drResources?.forEach((drResource) => {
    const drpc = drResource?.drPlacementControls?.find((drpc) => {
      const placementRef = drpc.spec?.placementRef;
      return (
        placementRef?.kind === placementKind &&
        placementRef?.name === placementName &&
        getNamespace(drpc) === workloadNamespace
      );
    });
    if (!!drpc) {
      result = {
        drPolicy: drResource?.drPolicy,
        drClusters: drResource?.drClusters,
        drPlacementControls: [drpc],
      };
      return true;
    }
    return false;
  });
  return result;
};

export const filterManagedClusterUsingDRClusters = (
  drClusters: DRClusterKind[],
  managedClusters: ACMManagedClusterKind[]
) =>
  managedClusters?.filter(
    (managedCluster) =>
      !!drClusters?.find(
        (drCluster) => getName(managedCluster) === getName(drCluster)
      )
  );

export const filerDRClustersUsingDRPolicy = (
  drPolicy: DRPolicyKind,
  drClusters: DRClusterKind[]
) =>
  drClusters?.filter((drCluster) =>
    drPolicy?.spec?.drClusters?.includes(getName(drCluster))
  );

export const findDRPCUsingDRPolicy = (
  drpcs: DRPlacementControlKind[],
  drPolicyName: string
): DRPlacementControlKind[] => {
  return drpcs?.filter(
    (drpc) => drpc?.spec?.drPolicyRef?.name === drPolicyName
  );
};

export const findDRPolicyUsingDRPC = (
  drpc: DRPlacementControlKind,
  drPolicies: DRPolicyKind[]
): DRPolicyKind =>
  drPolicies?.find(
    (drPolicy) => drpc?.spec?.drPolicyRef?.name === getName(drPolicy)
  );

export const isDRClusterFenced = (cluster: DRClusterKind) =>
  cluster?.status?.phase === 'Fenced';

export const matchClusters = (
  drClusterNames: string[],
  decisionClusters: string[]
): string =>
  drClusterNames?.find((drClusterName: string) =>
    decisionClusters?.includes(drClusterName)
  );

export const parseSyncInterval = (
  scheduledSyncInterval: string
): [TimeUnits, number] => {
  const regex = new RegExp(
    `([0-9]+)|([${TimeUnits.Days}|${TimeUnits.Hours}|${TimeUnits.Minutes}]+)`,
    'g'
  );
  const splittedArray = scheduledSyncInterval?.match(regex);
  const interval = Number(splittedArray?.[0] || 0);
  const unit = (splittedArray?.[1] || TimeUnits.Minutes) as TimeUnits;
  return [unit, interval];
};

export const convertSyncIntervalToSeconds = (
  syncInterval: string
): [number, TimeUnits] => {
  const [unit, scheduledSyncTime] = parseSyncInterval(syncInterval);
  const threshold =
    (unit === TimeUnits.Days && daysToSeconds(scheduledSyncTime)) ||
    (unit === TimeUnits.Hours && hoursToSeconds(scheduledSyncTime)) ||
    (unit === TimeUnits.Minutes && minutesToSeconds(scheduledSyncTime));
  return [threshold, unit];
};

export const getVolumeReplicationHealth = (
  slaTakenInSeconds: number,
  scheduledSyncInterval: string
): [VolumeReplicationHealth, number] => {
  const [syncIntervalInSeconds] = convertSyncIntervalToSeconds(
    scheduledSyncInterval
  );
  const slaDiff = slaTakenInSeconds / syncIntervalInSeconds || 0;
  if (slaDiff >= THRESHOLD) return [VolumeReplicationHealth.CRITICAL, slaDiff];
  else if (slaDiff > THRESHOLD - 1 && slaDiff < THRESHOLD)
    return [VolumeReplicationHealth.WARNING, slaDiff];
  else return [VolumeReplicationHealth.HEALTHY, slaDiff];
};

export const getProtectedPVCsFromDRPC = (
  drpc: DRPlacementControlKind
): string[] =>
  drpc?.status?.resourceConditions?.resourceMeta?.protectedpvcs || [];

export const getCurrentStatus = (drpcList: DRPlacementControlKind[]): string =>
  drpcList.reduce((prevStatus, drpc) => {
    const newStatus = drpc?.status?.phase;
    return newStatus &&
      [Phase.Relocating, Phase.FailingOver].includes(newStatus)
      ? newStatus
      : prevStatus || newStatus || '';
  }, '');

export const getDRStatus = ({
  currentStatus,
  targetClusters,
  customText,
  t,
}: {
  currentStatus: string;
  targetClusters?: string;
  customText?: string;
  t: TFunction;
}) => {
  switch (currentStatus) {
    case Phase.Relocating:
    case Phase.FailingOver:
      return {
        text: customText || currentStatus,
        icon: <InProgressIcon />,
        toolTip: (
          <>
            <h4>{t('Target cluster')}</h4>
            <p>{t('In use: {{targetClusters}}', { targetClusters })}</p>
          </>
        ),
      };
    case Phase.Relocated:
    case Phase.FailedOver:
      return {
        text: customText || currentStatus,
        icon: <GreenCheckCircleIcon />,
        toolTip: (
          <>
            <h4>{t('Target cluster')}</h4>
            <p>{t('Used: {{targetClusters}}', { targetClusters })}</p>
          </>
        ),
      };
    default:
      return {
        text: t('Unknown'),
        icon: <UnknownIcon />,
        toolTip: t('Unknown'),
      };
  }
};

const filterMulticlusterView = (mcvs: ACMManagedClusterViewKind[]) =>
  mcvs?.filter(
    (mcv) => mcv?.spec?.scope?.kind === DRVolumeReplicationGroup.kind
  );

export const getProtectedPVCFromVRG = (
  mcvs: ACMManagedClusterViewKind[]
): ProtectedPVCData[] => {
  const filteredMCVs = filterMulticlusterView(mcvs);
  return filteredMCVs?.reduce((acc, mcv) => {
    const drpcName = mcv?.metadata?.annotations?.[DRPC_NAME_ANNOTATION];
    const drpcNamespace =
      mcv?.metadata?.annotations?.[DRPC_NAMESPACE_ANNOTATION];
    const vrg = mcv?.status?.result as DRVolumeReplicationGroupKind;
    const pvcInfo: ProtectedPVCData[] = vrg?.status?.protectedPVCs?.map(
      (pvc) => ({
        drpcName,
        drpcNamespace,
        // VRG has async spec only for RDR
        replicationType: !!vrg?.spec?.async
          ? ReplicationType.ASYNC
          : ReplicationType.SYNC,
        pvcName: pvc?.name,
        pvcNamespace: getNamespace(vrg),
        lastSyncTime: pvc?.lastSyncTime,
        schedulingInterval: vrg?.spec?.async?.schedulingInterval,
      })
    );
    return !!pvcInfo?.length ? [...acc, ...pvcInfo] : acc;
  }, []);
};

export const filterPVCDataUsingApp = (
  pvcData: ProtectedPVCData,
  protectedApp: ProtectedAppsMap
) =>
  protectedApp?.placementControlInfo?.find((placementInfo) => {
    const result =
      placementInfo.drpcName === pvcData?.drpcName &&
      placementInfo.drpcNamespace === pvcData?.drpcNamespace;
    return result;
  });

export const filterPVCDataUsingApps = (
  pvcsData: ProtectedPVCData[],
  protectedApps: ProtectedAppsMap[]
) =>
  pvcsData?.filter(
    (pvcData) =>
      !!protectedApps?.find(
        (protectedApp) => !!filterPVCDataUsingApp(pvcData, protectedApp)
      )
  );

export const filterDRAlerts = (alert: Alert) =>
  alert?.annotations?.alert_type === 'DisasterRecovery' &&
  alert.state === AlertStates.Firing;

export const isDRPolicyValidated = (drPolicy: DRPolicyKind) =>
  drPolicy?.status?.conditions?.some(
    (condition) =>
      condition?.type === 'Validated' && condition?.status === 'True'
  );

export const getInvalidDRPolicyCondition = (
  drPolicy: DRPolicyKind
): K8sResourceCondition | undefined =>
  drPolicy?.status?.conditions?.find(
    (condition) =>
      condition.type === VALIDATED &&
      condition.status === K8sResourceConditionStatus.False
  );

// Finding placement from application generators
export const findPlacementNameFromAppSet = (
  application: ArgoApplicationSetKind
): string =>
  application?.spec?.generators?.[0]?.clusterDecisionResource?.labelSelector
    ?.matchLabels?.[PLACEMENT_REF_LABEL] || '';

export const findPlacementDecisionUsingPlacement = (
  placement: ACMPlacementType,
  placementDecisions: ACMPlacementDecisionKind[]
) => {
  const placementLabel =
    placement.kind === ACMPlacementModel.kind
      ? PLACEMENT_REF_LABEL
      : PLACEMENT_RULE_REF_LABEL;
  return placementDecisions?.find(
    (placementDecision) =>
      getLabel(placementDecision, placementLabel, '') === getName(placement) &&
      getNamespace(placementDecision) === getNamespace(placement)
  );
};

export const ValidateManagedClusterCondition = (
  managedCluster: ACMManagedClusterKind,
  conditionType: string
): boolean => {
  const condition = managedCluster?.status?.conditions?.find(
    (current) => current.type === conditionType
  );
  return !!condition && condition?.status === 'True';
};

export const findSiblingArgoAppSetsFromPlacement = (
  appName: string,
  placement: ACMPlacementKind,
  applications: ArgoApplicationSetKind[]
): ArgoApplicationSetKind[] =>
  applications?.filter(
    (application) =>
      appName !== getName(application) &&
      getNamespace(application) === getNamespace(placement) &&
      findPlacementNameFromAppSet(application) === getName(placement)
  );

export const findPlacementFromArgoAppSet = (
  placements: ACMPlacementKind[],
  application: ArgoApplicationSetKind
): ACMPlacementKind =>
  placements?.find(
    (placement) =>
      getNamespace(placement) === getNamespace(application) &&
      findPlacementNameFromAppSet(application) === getName(placement)
  );

export const getClustersFromDecisions = (
  placement: ACMPlacementDecisionKind | ACMPlacementRuleKind
): string[] =>
  placement?.status?.decisions.map((decision) => decision?.clusterName) || [];

export const getRemoteNamespaceFromAppSet = (
  application: ArgoApplicationSetKind
): string => application?.spec?.template?.spec?.destination?.namespace;

export const getLastAppDeploymentClusterName = (
  drPlacementControl: DRPlacementControlKind | DRPlacementControlType
) =>
  getAnnotations(drPlacementControl)?.[
    LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION
  ] || '';

export const findDeploymentClusters = (
  placementDecision: ACMPlacementDecisionKind,
  drPlacementControl: DRPlacementControlKind
): string[] => {
  if ((placementDecision ?? {}).status?.decisions?.length > 0) {
    return getClustersFromDecisions(placementDecision);
  } else {
    const lastDeploymentClusterName = getPrimaryClusterName(drPlacementControl);
    return !!lastDeploymentClusterName ? [lastDeploymentClusterName] : [];
  }
};

export const getPrimaryClusterName = (
  drPlacementControl: DRPlacementControlKind
) => {
  if (!drPlacementControl?.status?.phase) {
    return '';
  }

  switch (drPlacementControl.status.phase) {
    case Phase.FailedOver:
      return drPlacementControl.spec.failoverCluster;
    case Phase.Relocated:
      return drPlacementControl.spec.preferredCluster;
    default:
      return getLastAppDeploymentClusterName(drPlacementControl);
  }
};

export const getDRPolicyStatus = (isValidated, t) =>
  isValidated ? t('Validated') : t('Not validated');

export const parseNamespaceName = (namespaceName: string) =>
  namespaceName.split('/');

export const getNameNamespace = (name: string, namespace: string) =>
  !!name && !!namespace
    ? `${name}${NAME_NAMESPACE_SPLIT_CHAR}${namespace}`
    : '';

export const getLabelsFromSearchResult = (
  item: SearchResultItemType,
  isAllowBlocklist: boolean = false
): { [key in string]: string[] } => {
  // example label foo1=bar1;foo2=bar2
  const labels: string[] = item?.label?.split(LABELS_SPLIT_CHAR) || [];
  return labels?.reduce((acc, label) => {
    const [key, value] = label.split(LABEL_SPLIT_CHAR);
    if (isAllowBlocklist || !DR_BLOCK_LISTED_LABELS.includes(key)) {
      acc[key] = [...(acc[key] || []), value];
    }
    return acc;
  }, {});
};

export const getManagedClusterViewName = (managedClusterName: string): string =>
  MCV_NAME_TEMPLATE + managedClusterName;

export const getSearchResultItems = (searchResult: SearchResult) => {
  return searchResult?.data?.searchResult?.[0]?.related?.[0]?.items || [];
};

export const getProtectedCondition = (
  drpc: DRPlacementControlKind
): K8sResourceCondition | undefined => {
  const condition = drpc?.status?.conditions?.find(
    (condition) => condition.type === DRPlacementControlConditionType.Protected
  );
  if (!condition) return undefined;
  return condition;
};

export const getAvailableCondition = (
  drpc: DRPlacementControlKind
): K8sResourceCondition | undefined => {
  const condition = drpc?.status?.conditions?.find(
    (condition) => condition.type === DRPlacementControlConditionType.Available
  );
  if (!condition) return undefined;
  return condition;
};
