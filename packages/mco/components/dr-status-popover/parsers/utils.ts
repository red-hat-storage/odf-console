import { DRPlacementControlKind, VRGConditionReason } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
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
>;

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

  // Check if it's a discovered app: has protectedNamespaces defined and non-empty
  const isDiscoveredApp =
    drPlacementControl.spec?.protectedNamespaces !== undefined &&
    drPlacementControl.spec.protectedNamespaces.length > 0;

  return {
    progression: drPlacementControl.status?.progression,
    actionStartTime: drPlacementControl.status?.actionStartTime,
    action: drPlacementControl.spec?.action,
    progressionDetails: detailMessages.length ? detailMessages : undefined,
    applicationName,
    isDiscoveredApp,
  };
};
