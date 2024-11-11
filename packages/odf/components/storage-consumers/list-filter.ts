import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { StorageConsumerKind } from '@odf/shared/types';
import { fuzzyCaseInsensitive } from '@odf/shared/utils';
import { RowFilter } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const heartbeatPhases = ['Connected', 'Disconnected'];

export const getHeartbeatPhase = (client: StorageConsumerKind): string => {
  const heartbeat = client?.status?.lastHeartbeat;
  const timeElapsed = getTimeDifferenceInSeconds(heartbeat);
  if (timeElapsed <= 300) {
    return heartbeatPhases[0];
  }
  return heartbeatPhases[1];
};

export const clientHeartBeatFilter = (t): RowFilter<StorageConsumerKind> => ({
  type: 'client-status',
  filterGroupName: t('Status'),
  reducer: getHeartbeatPhase,
  items: _.map(heartbeatPhases, (phase) => ({
    id: phase,
    title: phase,
  })),
  filter: (phases, client) => {
    if (!phases || !phases.selected) {
      return true;
    }
    const phase = getHeartbeatPhase(client);
    return (
      phases.selected.includes(phase) ||
      !_.includes(phases.all, phase) ||
      _.isEmpty(phases.selected)
    );
  },
});

const dataFoundationMismatchStates = ['In sync', 'Out of sync'];

export const getMajorMinorVersion = (version: string) => {
  if (!version) {
    return ``;
  }
  const [major, minor] = version.split('.');
  return `${major}.${minor}`;
};

const getDataFoundationVersionState =
  (currentVersion: string) => (obj: StorageConsumerKind) =>
    getMajorMinorVersion(obj?.status?.client?.operatorVersion) ===
    getMajorMinorVersion(currentVersion)
      ? dataFoundationMismatchStates[0]
      : dataFoundationMismatchStates[1];

export const versionMismatchFilter = (
  t,
  currentODFVersion: string
): RowFilter<StorageConsumerKind> => ({
  type: 'client-version',
  filterGroupName: t('Data Foundation version sync'),
  reducer: getDataFoundationVersionState(currentODFVersion),
  items: _.map(dataFoundationMismatchStates, (phase) => ({
    id: phase,
    title: phase,
  })),
  filter: (phases, client) => {
    if (!phases || !phases.selected) {
      return true;
    }
    const phase = getDataFoundationVersionState(currentODFVersion)(client);
    return (
      phases.selected.includes(phase) ||
      !_.includes(phases.all, phase) ||
      _.isEmpty(phases.selected)
    );
  },
});

// overrides default "name" search filter
export const storageConsumerNameFilter =
  (): RowFilter<StorageConsumerKind> => ({
    type: 'name',
    filterGroupName: '',
    reducer: () => undefined,
    items: [],
    filter: (filterValue, storageConsumer) =>
      fuzzyCaseInsensitive(
        filterValue.selected?.[0],
        storageConsumer?.status?.client?.name || ''
      ),
  });
