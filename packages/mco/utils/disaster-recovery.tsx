import * as React from 'react';
import {
  daysToSeconds,
  hoursToSeconds,
  minutesToSeconds,
} from '@odf/shared/details-page/datetime';
import { objectify } from '@odf/shared/modals/EditLabelModal';
import {
  getLabel,
  hasLabel,
  getName,
  getNamespace,
  getAnnotations,
} from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types/k8s';
import { getAPIVersionForModel } from '@odf/shared/utils';
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
import { TFunction } from 'i18next';
import { InProgressIcon, UnknownIcon } from '@patternfly/react-icons';
import {
  VOLUME_REPLICATION_HEALTH,
  DR_SECHEDULER_NAME,
  DRPC_STATUS,
  THRESHOLD,
  DRActionType,
} from '../constants';
import {
  DRPC_NAMESPACE_ANNOTATION,
  DRPC_NAME_ANNOTATION,
  REPLICATION_TYPE,
  TIME_UNITS,
  PROTECTED_APP_ANNOTATION,
  PLACEMENT_REF_LABEL,
  LAST_APP_DEPLOYMENT_CLUSTER_ANNOTATION,
} from '../constants';
import { DisasterRecoveryFormatted, ApplicationRefKind } from '../hooks';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  DRPlacementControlModel,
  DRPolicyModel,
  DRVolumeReplicationGroup,
} from '../models';
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
  ProtectedAppSetsMap,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  MirrorPeerKind,
  ArgoApplicationSetKind,
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

export const getReplicationType = (interval: string, t: TFunction) =>
  interval !== '0m'
    ? t('{{async}}, interval: {{interval}}', {
        async: REPLICATION_TYPE.ASYNC,
        interval,
      })
    : REPLICATION_TYPE.SYNC;

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

export const findDRType = (drClusters: DRClusterKind[]) =>
  drClusters?.every(
    (drCluster) => drCluster?.spec?.region === drClusters?.[0]?.spec?.region
  )
    ? REPLICATION_TYPE.SYNC
    : REPLICATION_TYPE.ASYNC;

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

export const filerManagedClusterUsingDRClusters = (
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
): [TIME_UNITS, number] => {
  const regex = new RegExp(
    `([0-9]+)|([${TIME_UNITS.Days}|${TIME_UNITS.Hours}|${TIME_UNITS.Minutes}]+)`,
    'g'
  );
  const splittedArray = scheduledSyncInterval?.match(regex);
  const interval = Number(splittedArray?.[0] || 0);
  const unit = (splittedArray?.[1] || TIME_UNITS.Minutes) as TIME_UNITS;
  return [unit, interval];
};

export const convertSyncIntervalToSeconds = (
  syncInterval: string
): [number, TIME_UNITS] => {
  const [unit, scheduledSyncTime] = parseSyncInterval(syncInterval);
  const threshold =
    (unit === TIME_UNITS.Days && daysToSeconds(scheduledSyncTime)) ||
    (unit === TIME_UNITS.Hours && hoursToSeconds(scheduledSyncTime)) ||
    (unit === TIME_UNITS.Minutes && minutesToSeconds(scheduledSyncTime));
  return [threshold, unit];
};

export const getVolumeReplicationHealth = (
  slaTakenInSeconds: number,
  scheduledSyncInterval: string
): [VOLUME_REPLICATION_HEALTH, number] => {
  const [syncIntervalInSeconds] = convertSyncIntervalToSeconds(
    scheduledSyncInterval
  );
  const slaDiff = slaTakenInSeconds / syncIntervalInSeconds || 0;
  if (slaDiff >= THRESHOLD)
    return [VOLUME_REPLICATION_HEALTH.CRITICAL, slaDiff];
  else if (slaDiff > THRESHOLD - 1 && slaDiff < THRESHOLD)
    return [VOLUME_REPLICATION_HEALTH.WARNING, slaDiff];
  else return [VOLUME_REPLICATION_HEALTH.HEALTHY, slaDiff];
};

export const getProtectedPVCsFromDRPC = (
  drpc: DRPlacementControlKind
): string[] =>
  drpc?.status?.resourceConditions?.resourceMeta?.protectedpvcs || [];

export const getCurrentStatus = (drpcList: DRPlacementControlKind[]): string =>
  drpcList.reduce((prevStatus, drpc) => {
    const newStatus = DRPC_STATUS[drpc?.status?.phase] || '';
    return [DRPC_STATUS.Relocating, DRPC_STATUS.FailingOver].includes(newStatus)
      ? newStatus
      : prevStatus || newStatus;
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
    case DRPC_STATUS.Relocating:
    case DRPC_STATUS.FailingOver:
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
    case DRPC_STATUS.Relocated:
    case DRPC_STATUS.FailedOver:
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

export const findAppsUsingDRPolicy = (
  appsRefs: ApplicationRefKind[],
  drPolicy: DRPolicyKind
) =>
  appsRefs?.filter((appsRef) =>
    appsRef?.drPolicyRefs?.includes(getName(drPolicy))
  );

const filterMulticlusterView = (mcvs: ACMManagedClusterViewKind[]) =>
  mcvs?.filter(
    (mcv) => mcv?.spec?.scope?.resource === DRVolumeReplicationGroup.kind
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
    const pvcInfo = vrg?.status?.protectedPVCs?.map((pvc) => ({
      drpcName,
      drpcNamespace,
      pvcName: pvc?.name,
      pvcNamespace: getNamespace(vrg),
      lastSyncTime: pvc?.lastSyncTime,
      schedulingInterval: vrg?.spec?.async?.schedulingInterval,
    }));
    return !!pvcInfo?.length ? [...acc, ...pvcInfo] : acc;
  }, []);
};

export const filterPVCDataUsingAppsets = (
  pvcsData: ProtectedPVCData[],
  protectedAppsets: ProtectedAppSetsMap[]
) =>
  pvcsData?.filter(
    (pvcData) =>
      !!protectedAppsets?.find((appSet) => {
        const placementInfo = appSet?.placementInfo?.[0];
        const result =
          placementInfo?.drpcName === pvcData?.drpcName &&
          placementInfo?.drpcNamespace === pvcData?.drpcNamespace;
        return result;
      })
  );

export const filterDRAlerts = (alert: Alert) =>
  alert?.annotations?.alert_type === 'DisasterRecovery' &&
  alert.state === AlertStates.Firing;

export const isDRPolicyValidated = (drPolicy: DRPolicyKind) =>
  drPolicy?.status?.conditions?.some(
    (condition) =>
      condition?.type === 'Validated' && condition?.status === 'True'
  );

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

// Finding placement from application generators
export const findPlacementNameFromAppSet = (
  application: ArgoApplicationSetKind
): string =>
  application?.spec?.generators?.[0]?.clusterDecisionResource?.labelSelector
    ?.matchLabels?.[PLACEMENT_REF_LABEL] || '';

export const findPlacementDecisionUsingPlacement = (
  placement: ACMPlacementKind,
  placementDecisions: ACMPlacementDecisionKind[]
) =>
  placementDecisions?.find(
    (placementDecision) =>
      getLabel(placementDecision, PLACEMENT_REF_LABEL, '') ===
        getName(placement) &&
      getNamespace(placementDecision) === getNamespace(placement)
  );

export const getManagedClusterCondition = (
  managedCluster: ACMManagedClusterKind,
  conditionType: string
) =>
  managedCluster?.status?.conditions?.find(
    (condition) =>
      condition?.type === conditionType && condition.status === 'True'
  );

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
  drPlacementControl: DRPlacementControlKind
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
    const lastDeploymentClusterName =
      getLastAppDeploymentClusterName(drPlacementControl);
    return !!lastDeploymentClusterName ? [lastDeploymentClusterName] : [];
  }
};

export const getDRPolicyStatus = (isValidated, t) =>
  isValidated ? t('Validated') : t('Not Validated');
