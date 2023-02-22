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
} from '../../../constants';
import { DRPolicyState, DRPolicyAction, DRPolicyActionType } from './reducer';
import '../../../style.scss';

type SyncScheduleProps = {
  state: DRPolicyState;
  dispatch: React.Dispatch<DRPolicyAction>;
};

const minSyncTime = 1;
const getSyncTime = (timeWithFormat: string) =>
  Number(timeWithFormat.match(/\d+/g)[0]);

const SyncSchedule: React.FC<SyncScheduleProps> = ({ state, dispatch }) => {
  const { t } = useCustomTranslation();

  const SyncSchedule = {
    minutes: t('minutes'),
    hours: t('hours'),
    days: t('days'),
  };
  const SCHEDULE_FORMAT = {
    [SyncSchedule.minutes]: TIME_UNITS.Minutes,
    [SyncSchedule.hours]: TIME_UNITS.Hours,
    [SyncSchedule.days]: TIME_UNITS.Days,
  };

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedFormat, setSelectedFormat] = React.useState(
    SyncSchedule.minutes
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

  const SyncScheduleDropdownItems = Object.values(SyncSchedule).map((sync) => (
    <DropdownItem
      data-test-id={`sync-schedule-dropdown-item-${sync}`}
      key={`sync-schedule-dropdown-item-${sync}`}
      value={sync}
      component="button"
    >
      {sync}
    </DropdownItem>
  ));

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

export const DRReplicationType: React.FC<DRReplicationTypeProps> = ({
  state,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isReplicationOpen, setReplicationOpen] = React.useState(false);

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

  const errorMessage = (message: string) => (
    <Alert
      data-test="odf-not-found-alert"
      className="odf-alert mco-create-data-policy__alert"
      title={message}
      variant={AlertVariant.danger}
      isInline
    />
  );

  return (
    <>
      {state.isODFDetected ? (
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
      ) : (
        !state.errorMessage &&
        state.selectedClusters?.map((c) =>
          !c.isValidODFVersion
            ? errorMessage(
                t(
                  '{{ name }} has either an unsupported ODF version or the ODF operator is missing, install or update to ODF {{ version }} or latest version to enable DR protection.',
                  { name: c?.name, version: requiredODFVersion }
                )
              )
            : c.cephFSID === '' &&
              errorMessage(
                t('{{ name }} is not connected to RHCS', {
                  name: c?.name,
                })
              )
        )
      )}
    </>
  );
};
