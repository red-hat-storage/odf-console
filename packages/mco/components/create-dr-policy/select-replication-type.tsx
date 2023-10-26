import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  NumberInput,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  InputGroup,
  Alert,
  AlertVariant,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import {
  REPLICATION_TYPE,
  REPLICATION_DISPLAY_TEXT,
  TIME_UNITS,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '../../constants';
import {
  DRPolicyState,
  DRPolicyAction,
  DRPolicyActionType,
  Cluster,
} from './reducer';
import '../../style.scss';

type SyncScheduleProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
};

const minSyncTime = 1;
const getSyncTime = (timeWithFormat: string) =>
  Number(timeWithFormat.match(/\d+/g)[0]);

const getSyncScheduleFormat = (
  SyncScheduleFormat: { [key in TIME_UNITS]: string }
) => ({
  [SyncScheduleFormat.m]: TIME_UNITS.Minutes,
  [SyncScheduleFormat.h]: TIME_UNITS.Hours,
  [SyncScheduleFormat.d]: TIME_UNITS.Days,
});

const SyncSchedule: React.FC<SyncScheduleProps> = ({ state, dispatch }) => {
  const { t } = useCustomTranslation();

  const SyncScheduleFormat = SYNC_SCHEDULE_DISPLAY_TEXT(t);
  const SCHEDULE_FORMAT = getSyncScheduleFormat(SyncScheduleFormat);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState(
    SyncScheduleFormat.m
  );

  const setSyncSchedule = (time: number, format?: string) =>
    dispatch({
      type: DRPolicyActionType.SET_SYNC_TIME,
      payload: `${time}${SCHEDULE_FORMAT[format ?? selectedFormat]}`,
    });

  const onSelect = (event) => {
    const scheduleTime = getSyncTime(state.syncTime);
    const newScheduleFormat = event.target.value;
    setIsOpen(false);
    setSelectedFormat(newScheduleFormat);
    setSyncSchedule(scheduleTime, newScheduleFormat);
  };

  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const syncTime = isNaN(+target.value) ? minSyncTime : Number(target.value);
    const normalizedSyncTime = syncTime < minSyncTime ? minSyncTime : syncTime;
    setSyncSchedule(normalizedSyncTime);
  };

  const SyncScheduleDropdownItems = Object.values(SyncScheduleFormat).map(
    (sync) => (
      <DropdownItem
        data-test-id={`sync-schedule-dropdown-item-${sync}`}
        key={`sync-schedule-dropdown-item-${sync}`}
        value={sync}
        component="button"
      >
        {sync}
      </DropdownItem>
    )
  );

  return (
    <InputGroup>
      <NumberInput
        id="sync-schedule"
        data-test="sync-schedule-text"
        value={getSyncTime(state.syncTime)}
        min={minSyncTime}
        onMinus={() => setSyncSchedule(getSyncTime(state.syncTime) - 1)}
        onPlus={() => setSyncSchedule(getSyncTime(state.syncTime) + 1)}
        onChange={onChange}
      />
      <Dropdown
        data-test="sync-schedule-dropdown"
        aria-label={t('Select schedule time format in minutes, hours or days')}
        onSelect={onSelect}
        toggle={
          <DropdownToggle
            onToggle={(open) => setIsOpen(open)}
            data-test-id="sync-schedule-dropdown-toggle"
          >
            {selectedFormat}
          </DropdownToggle>
        }
        isOpen={isOpen}
        dropdownItems={SyncScheduleDropdownItems}
      />
    </InputGroup>
  );
};

type DRReplicationTypeProps = {
  state: DRPolicyState;
  requiredODFVersion: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

type ErrorMessageType = {
  message: string;
  description?: string;
};

type ClusterErrorType = {
  unAvailableClusters: string[];
  clustersWithUnSupportedODF: string[];
  clustersWithoutODF: string[];
  clustersWithUnSuccessfulODF: string[];
};

const getClusterErrorInfo = (selectedClusters: Cluster[]): ClusterErrorType =>
  selectedClusters.reduce(
    (acc, cluster) => {
      if (!cluster.isManagedClusterAvailable) {
        acc.unAvailableClusters.push(cluster.name);
      }
      if (!cluster.storageSystemName) {
        acc.clustersWithUnSupportedODF.push(cluster.name);
      }
      if (!cluster.isValidODFVersion) {
        acc.clustersWithoutODF.push(cluster.name);
      }
      if (cluster.cephFSID === '') {
        acc.clustersWithUnSuccessfulODF.push(cluster.name);
      }
      return acc;
    },
    {
      unAvailableClusters: [],
      clustersWithUnSupportedODF: [],
      clustersWithoutODF: [],
      clustersWithUnSuccessfulODF: [],
    }
  );

const getErrorMessage = (
  selectedClusters: Cluster[],
  requiredODFVersion: string,
  t
): ErrorMessageType => {
  const clusterErrorInfo = getClusterErrorInfo(selectedClusters);
  if (!!clusterErrorInfo.unAvailableClusters.length) {
    return {
      message: t('1 or more managed clusters are offline'),
      description: t(
        'The status for both the managed clusters must be available for creating a DR policy. To restore a cluster to an available state, refer to the instructions in the ACM documentation.'
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithUnSupportedODF.length) {
    return {
      message: t('Cannot proceed with one or more selected clusters'),
      description: t(
        'We could not retrieve any information about the managed cluster {{names}}. Check the documentation for potential causes and follow the steps mentioned and try again.',
        { names: clusterErrorInfo.clustersWithUnSupportedODF.join(' & ') }
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithoutODF.length) {
    return {
      message: t(
        '{{ names }} has either an unsupported ODF version or the ODF operator is missing, install or update to ODF {{ version }} or the latest version to enable DR protection.',
        {
          names: clusterErrorInfo.clustersWithoutODF.join(' & '),
          version: requiredODFVersion,
        }
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithUnSuccessfulODF.length) {
    return {
      message: t('{{ names }} is not connected to RHCS', {
        names: clusterErrorInfo.clustersWithUnSuccessfulODF.join(' & '),
      }),
    };
  }
  return null;
};

export const DRReplicationType: React.FC<DRReplicationTypeProps> = ({
  state,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isReplicationOpen, setReplicationOpen] = React.useState(false);
  const errorMessage = React.useMemo(
    () => getErrorMessage(state.selectedClusters, requiredODFVersion, t),
    [state.selectedClusters, requiredODFVersion, t]
  );

  const replicationDropdownItems = React.useMemo(
    () =>
      Object.keys(REPLICATION_DISPLAY_TEXT(t)).map((replType) => (
        <DropdownItem
          isDisabled={!state.isReplicationInputManual}
          key={replType}
          component="button"
          id={replType}
          data-test="replication-dropdown-item"
          onClick={() =>
            dispatch({
              type: DRPolicyActionType.SET_REPLICATION,
              payload: replType,
            })
          }
        >
          {REPLICATION_DISPLAY_TEXT(t)[replType]}
        </DropdownItem>
      )),
    [state.isReplicationInputManual, dispatch, t]
  );

  return (
    <>
      {!!errorMessage ? (
        <Alert
          data-test="odf-not-found-alert"
          className="odf-alert mco-create-data-policy__alert"
          title={errorMessage.message}
          variant={AlertVariant.danger}
          isInline
        >
          {errorMessage?.description}
        </Alert>
      ) : (
        <>
          {state.replication && (
            <FormGroup
              fieldId="replication-policy"
              label={t('Replication policy')}
            >
              <Dropdown
                data-test="replication-dropdown"
                className="mco-create-data-policy__dropdown"
                onSelect={() => setReplicationOpen(false)}
                toggle={
                  <DropdownToggle
                    data-test="replication-dropdown-toggle"
                    isDisabled={!state.isReplicationInputManual}
                    className="mco-create-data-policy__dropdown"
                    id="toggle-id"
                    onToggle={() => setReplicationOpen(!isReplicationOpen)}
                    toggleIndicator={CaretDownIcon}
                  >
                    {REPLICATION_DISPLAY_TEXT(t)[state.replication]}
                  </DropdownToggle>
                }
                isOpen={isReplicationOpen}
                dropdownItems={replicationDropdownItems}
              />
            </FormGroup>
          )}
          {state.replication === REPLICATION_TYPE.ASYNC && (
            <FormGroup fieldId="sync-schedule" label={t('Sync schedule')}>
              <SyncSchedule state={state} dispatch={dispatch} />
            </FormGroup>
          )}
        </>
      )}
    </>
  );
};
