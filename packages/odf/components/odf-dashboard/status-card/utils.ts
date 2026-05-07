import { StorageConsumerKind, StorageConsumerState } from '@odf/shared';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';

type HealthStateItem = {
  healthState: HealthState;
};

// Prefer ERROR over LOADING so a known failure is not hidden behind a skeleton.
const AGGREGATE_HEALTH_PRIORITY = [
  HealthState.ERROR,
  HealthState.WARNING,
  HealthState.NOT_AVAILABLE,
  HealthState.PROGRESS,
  HealthState.UPDATING,
  HealthState.UPGRADABLE,
  HealthState.LOADING,
  HealthState.UNKNOWN,
  HealthState.OK,
];

export const getWorstHealthState = (
  items: HealthStateItem[] = []
): HealthState => {
  for (const state of AGGREGATE_HEALTH_PRIORITY) {
    if (items.some((item) => item.healthState === state)) {
      return state;
    }
  }
  return HealthState.UNKNOWN;
};

const getHealthAndTotalClientCounts = (clients: StorageConsumerKind[]) => {
  const connectedClients = clients.filter(
    (client) => client.status?.state === StorageConsumerState.Ready
  );

  const healthyClients = connectedClients.filter(
    (client) => getTimeDifferenceInSeconds(client.status?.lastHeartbeat) < 120
  );
  const healthyClientsCount = healthyClients.length;
  const totalClientsCount = clients.length;

  return [healthyClientsCount, totalClientsCount];
};

export const getAggregateClientHealthState = (
  clients: StorageConsumerKind[] = []
) => {
  const [healthyClientsCount, totalClientsCount] =
    getHealthAndTotalClientCounts(clients);
  if (totalClientsCount === healthyClientsCount && totalClientsCount > 0) {
    return HealthState.OK;
  }
  if (totalClientsCount > healthyClientsCount) {
    return HealthState.ERROR;
  }
  if (totalClientsCount === 0) {
    return HealthState.NOT_AVAILABLE;
  }
  return HealthState.UNKNOWN;
};

export const getClientText = (clients: StorageConsumerKind[], t: TFunction) => {
  const [healthyClientsCount, totalClientsCount] =
    getHealthAndTotalClientCounts(clients);
  if (totalClientsCount === 0) {
    return t('0 connected');
  } else {
    return t('{{connected}} / {{total}} connected', {
      connected: healthyClientsCount,
      total: totalClientsCount,
    });
  }
};
