import { formatTime } from '@odf/shared/details-page/datetime';
import { K8sResourceCondition } from '@odf/shared/types';
import { DRPlacementControlKind } from '@odf/mco/types';
import { DRStatusProps } from '../dr-status-popover';

type ProgressionFields = Pick<
  DRStatusProps,
  | 'progression'
  | 'action'
  | 'actionStartTime'
  | 'progressionDetails'
  | 'applicationName'
>;

const parseTime = (value?: string): number =>
  value ? Date.parse(value) || 0 : 0;

const formatConditionDetail = (condition?: K8sResourceCondition): string => {
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
): ProgressionFields => {
  if (!drPlacementControl) return {};

  const drpcDetails = buildDetailList(
    drPlacementControl.status?.conditions,
    (condition) => condition?.status !== 'True'
  );

  const resourceDetails = buildDetailList(
    drPlacementControl.status?.resourceConditions?.conditions,
    (condition) =>
      condition?.status !== 'True' && condition?.reason !== 'Unused'
  );

  const detailMessages = [...drpcDetails, ...resourceDetails];

  const applicationName =
    drPlacementControl.metadata?.annotations?.[
      'drplacementcontrol.ramendr.openshift.io/app-namespace'
    ] || drPlacementControl.metadata?.name;

  return {
    progression: drPlacementControl.status?.progression,
    actionStartTime: drPlacementControl.status?.actionStartTime,
    action: drPlacementControl.spec?.action,
    progressionDetails: detailMessages.length ? detailMessages : undefined,
    applicationName,
  };
};
