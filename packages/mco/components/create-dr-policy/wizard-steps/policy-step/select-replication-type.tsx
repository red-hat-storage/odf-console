import * as React from 'react';
import { normalizeSyncTimeValue, parseSyncInterval } from '@odf/mco/utils';
import { type StorageVendorDescriptor } from '@odf/mco/utils/storage-vendor-registry';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { FormGroup, SelectOption } from '@patternfly/react-core';
import {
  MIN_VALUE,
  REPLICATION_DISPLAY_TEXT,
  ReplicationMode,
  ReplicationType,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '../../../../constants';
import { DRPolicyAction, DRPolicyActionType } from '../../utils/reducer';
import '../../create-dr-policy.scss';

const SyncSchedule: React.FC<SyncScheduleProps> = ({
  syncIntervalTime,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const SyncScheduleFormat = SYNC_SCHEDULE_DISPLAY_TEXT(t);
  const [unitVal, interval] = parseSyncInterval(syncIntervalTime);

  const onChange = (event) => {
    const { value, unit } = event;
    dispatch({
      type: DRPolicyActionType.SET_SYNC_INTERVAL_TIME,
      payload: `${normalizeSyncTimeValue(value)}${unit}`,
    });
  };

  return (
    <RequestSizeInput
      name={t('Replication interval')}
      onChange={onChange}
      dropdownUnits={SyncScheduleFormat}
      defaultRequestSizeUnit={unitVal}
      defaultRequestSizeValue={interval.toString()}
      minValue={MIN_VALUE}
    />
  );
};

// The replication type is set with the provider (see the reducer); it is shown here, not chosen.
export const SelectReplicationType: React.FC<SelectReplicationTypeProps> = ({
  descriptor,
  syncIntervalTime,
  replicationType,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const replicationDropdownItems = Object.entries(
    REPLICATION_DISPLAY_TEXT(t)
  ).map(([key, value]) => (
    <SelectOption
      key={key}
      id={key}
      data-test="replication-dropdown-item"
      value={value}
    >
      {value}
    </SelectOption>
  ));

  const onChange = (replType: ReplicationType) =>
    dispatch({
      type: DRPolicyActionType.SET_REPLICATION_TYPE,
      payload: replType,
    });

  const showInterval =
    descriptor?.replication.mode === ReplicationMode.Async ||
    (descriptor?.replication.mode === ReplicationMode.Derived &&
      replicationType === ReplicationType.ASYNC);

  return (
    <>
      <FormGroup
        fieldId="replication-policy"
        label={t('Replication policy')}
        className="mco-create-data-policy__dropdown"
      >
        <SingleSelectDropdown
          id="replication-type-dropdown"
          selectedKey={REPLICATION_DISPLAY_TEXT(t)[replicationType]}
          isDisabled={true}
          selectOptions={replicationDropdownItems}
          onChange={onChange}
        />
      </FormGroup>
      {showInterval && (
        <FormGroup label={t('Replication interval')}>
          <SyncSchedule
            syncIntervalTime={syncIntervalTime}
            dispatch={dispatch}
          />
        </FormGroup>
      )}
    </>
  );
};

type SyncScheduleProps = {
  syncIntervalTime: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

type SelectReplicationTypeProps = {
  descriptor?: StorageVendorDescriptor;
  syncIntervalTime: string;
  replicationType: ReplicationType;
  dispatch: React.Dispatch<DRPolicyAction>;
};
