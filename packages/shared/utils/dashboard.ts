import {
  healthStateMapping,
  healthStateMessage,
} from '@odf/shared/dashboards/status-card/states';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { TFunction } from 'i18next';

const DASH_PREFIX = '/odf/system';

export const getDashboardLink = (systemKind: string, systemName: string) =>
  `${DASH_PREFIX}/${systemKind}/${systemName}`;

export const getWorstStatus = (
  componentsHealth: SubsystemHealth[],
  t: TFunction
): { state: HealthState; message: string; count: number } => {
  const withPriority = componentsHealth.map((h) => healthStateMapping[h.state]);
  const mostImportantState = Math.max(
    ...withPriority.map(({ priority }) => priority)
  );
  const worstStatuses = withPriority.filter(
    ({ priority }) => priority === mostImportantState
  );
  return {
    state: worstStatuses[0].health,
    message: healthStateMessage(worstStatuses[0].health, t),
    count: worstStatuses.length,
  };
};
