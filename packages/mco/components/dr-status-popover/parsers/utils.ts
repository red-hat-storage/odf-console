import {
  DRActionType,
  TEST_FAILOVER_DRYRUN_ANNOTATION,
} from '@odf/mco/constants';
import { DRPlacementControlKind, VRGConditionReason } from '@odf/mco/types';
import {
  getLastAppDeploymentClusterName,
  isDiscoveredDRPC,
} from '@odf/mco/utils';
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
  | 'testFailoverCleanupCluster'
>;

/**
 * After a failover test ends, the cluster left holding the test workload, or
 * undefined when there is nothing to clean up.
 *
 * A test ends one of two ways. Promote keeps the workload on the test cluster,
 * so nothing is left behind. Revert sends it back and strands the test copy.
 * Like Ramen, we call it a promote only when the action is still Failover and
 * failoverCluster still matches the deployment cluster; anything else is a
 * revert.
 */
const getTestFailoverCleanupCluster = (
  drPlacementControl: DRPlacementControlKind
): string | undefined => {
  const hasTestAnnotation =
    getAnnotations(drPlacementControl)?.[TEST_FAILOVER_DRYRUN_ANNOTATION] ===
    'true';

  // Ramen keeps the annotation until cleanup is done, so this is "a test ran
  // and has now ended".
  if (drPlacementControl.spec?.dryRun || !hasTestAnnotation) {
    return undefined;
  }

  // Where the test ran. last-app-deployment-cluster is no good here, Ramen
  // points it back at the original cluster as soon as the revert starts.
  const testCluster = drPlacementControl.spec?.failoverCluster;

  // On promote the workload stays put, so the deployment cluster catches up to
  // the failover cluster and the action stays Failover. A revert clears or
  // re-points the action and leaves the deployment cluster behind. Mirrors
  // Ramen's isFailoverPromotion(), dryRun included so the three conditions read
  // together even though the guard above has already ruled it out.
  const isPromotion =
    drPlacementControl.spec?.action === DRActionType.FAILOVER &&
    testCluster === getLastAppDeploymentClusterName(drPlacementControl) &&
    !drPlacementControl.spec?.dryRun;

  return isPromotion ? undefined : testCluster;
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
  drPlacementControl?: DRPlacementControlKind
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

  return {
    progression: drPlacementControl.status?.progression,
    actionStartTime: drPlacementControl.status?.actionStartTime,
    action: drPlacementControl.spec?.action,
    dryRun: drPlacementControl.spec?.dryRun,
    testFailoverCleanupCluster:
      getTestFailoverCleanupCluster(drPlacementControl),
    progressionDetails: detailMessages.length ? detailMessages : undefined,
    applicationName,
    isDiscoveredApp: isDiscoveredDRPC(drPlacementControl),
  };
};
