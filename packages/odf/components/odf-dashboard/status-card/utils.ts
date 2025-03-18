import { StorageConsumerKind, StorageConsumerState } from '@odf/shared';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';

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
