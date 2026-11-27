import {
  DRActionType,
  LAST_ACTION_ANNOTATION,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '@odf/mco/constants';
import { DRPlacementControlKind, VRGConditionReason } from '@odf/mco/types';
import {
  drpcHasVolumes,
  getLastAppDeploymentClusterName,
  getPeerClusterName,
  isDiscoveredDRPC,
} from '@odf/mco/utils';
import { isRevertingTestFailover } from '@odf/mco/utils/test-failover';
import { formatTime } from '@odf/shared/details-page/datetime';
import { getAnnotations } from '@odf/shared/selectors';
import {
  K8sResourceCondition,
  K8sResourceConditionStatus,
} from '@odf/shared/types';
import { DRStatusProps } from '../dr-status-popover';

type ProgressionFields = Pick<
  DRStatusProps,
  | 'progression'
  | 'action'
  | 'actionStartTime'
  | 'progressionDetails'
  | 'applicationName'
  | 'dryRun'
  | 'hasTestFailoverAnnotation'
  | 'hasVolumes'
  | 'testFailoverCleanupCluster'
  | 'promotedFromTest'
  | 'isRevertingTestFailover'
  | 'lastAction'
  | 'failoverCluster'
  | 'drpcName'
  | 'drpcNamespace'
>;

// Leftover test resources sit on the DRPolicy peer of last-app-deployment-cluster
// (Ramen freezes that annotation as pre-test home during the test). Promote keeps
// failoverCluster on that peer — no leftover cleanup then.
const getTestFailoverCleanupCluster = (
  drPlacementControl: DRPlacementControlKind,
  drClusterNames: string[]
): string | undefined => {
  if (
    drPlacementControl.spec?.dryRun ||
    getAnnotations(drPlacementControl)?.[TEST_FAILOVER_DRYRUN_ANNOTATION] !==
      'true'
  ) {
    return undefined;
  }

  const homeCluster = getLastAppDeploymentClusterName(drPlacementControl);
  const testCluster = getPeerClusterName(homeCluster, drClusterNames);
  if (!testCluster) {
    return undefined;
  }

  const failoverCluster = drPlacementControl.spec?.failoverCluster;
  const isPromoteShape =
    drPlacementControl.spec?.action === DRActionType.FAILOVER &&
    !drPlacementControl.spec?.dryRun &&
    failoverCluster === testCluster &&
    failoverCluster !== homeCluster;

  if (isPromoteShape) {
    return undefined;
  }

  return testCluster;
};

const parseTime = (value?: string): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return isNaN(parsed) ? 0 : parsed;
};

const formatConditionDetail = (
  condition?: K8sResourceCondition
): string | null => {
  if (!condition) return null;

  const timestamp = condition.lastTransitionTime
    ? formatTime(condition.lastTransitionTime)
    : null;

  const meta = [condition.type, condition.reason].filter(Boolean).join(' / ');

  const message = condition.message;

  return [timestamp, meta, message].filter(Boolean).join(' — ');
};

const buildDetailList = (
  conditions: K8sResourceCondition[] = [],
  predicate: (condition: K8sResourceCondition) => boolean
): string[] =>
  conditions
    .filter((condition) => condition && predicate(condition))
    .sort(
      (a, b) =>
        parseTime(b.lastTransitionTime) - parseTime(a.lastTransitionTime)
    )
    .map((condition) => formatConditionDetail(condition))
    .filter(Boolean);

export const getProgressionFields = (
  drPlacementControl?: DRPlacementControlKind,
  drClusterNames: string[] = []
): ProgressionFields & { isDiscoveredApp?: boolean } => {
  if (!drPlacementControl) return {};

  const drpcDetails = buildDetailList(
    drPlacementControl.status?.conditions,
    (condition) => condition?.status !== K8sResourceConditionStatus.True
  );

  const resourceDetails = buildDetailList(
    drPlacementControl.status?.resourceConditions?.conditions,
    (condition) =>
      condition?.status !== K8sResourceConditionStatus.True &&
      condition?.reason !== VRGConditionReason.Unused
  );

  const detailMessages = [...drpcDetails, ...resourceDetails];

  const applicationName =
    drPlacementControl.metadata?.name ||
    drPlacementControl.metadata?.annotations?.[
      'drplacementcontrol.ramendr.openshift.io/app-namespace'
    ];

  const annotations = getAnnotations(drPlacementControl);
  const homeCluster = getLastAppDeploymentClusterName(drPlacementControl);
  const testCluster = getPeerClusterName(homeCluster, drClusterNames);
  const failoverCluster = drPlacementControl.spec?.failoverCluster;

  const hasTestFailoverAnnotation =
    annotations?.[TEST_FAILOVER_DRYRUN_ANNOTATION] === 'true';

  // Promote: failoverCluster still names the test peer while last-app is home.
  const promotedFromTest =
    hasTestFailoverAnnotation &&
    drPlacementControl.spec?.action === DRActionType.FAILOVER &&
    !drPlacementControl.spec?.dryRun &&
    !!testCluster &&
    failoverCluster === testCluster &&
    failoverCluster !== homeCluster;

  return {
    progression: drPlacementControl.status?.progression,
    actionStartTime: drPlacementControl.status?.actionStartTime,
    action: drPlacementControl.spec?.action,
    dryRun: drPlacementControl.spec?.dryRun,
    hasTestFailoverAnnotation,
    hasVolumes: drpcHasVolumes(drPlacementControl),
    testFailoverCleanupCluster: getTestFailoverCleanupCluster(
      drPlacementControl,
      drClusterNames
    ),
    promotedFromTest,
    isRevertingTestFailover: isRevertingTestFailover(drPlacementControl),
    // Keep missing (undefined) vs empty ('') distinct for Clean up restore.
    // Empty means Deployed; missing must not guess Deployed.
    lastAction: annotations?.[LAST_ACTION_ANNOTATION],
    failoverCluster: failoverCluster || '',
    progressionDetails: detailMessages.length ? detailMessages : undefined,
    applicationName,
    isDiscoveredApp: isDiscoveredDRPC(drPlacementControl),
    drpcName: drPlacementControl.metadata?.name,
    drpcNamespace: drPlacementControl.metadata?.namespace,
  };
};
