import * as React from 'react';
import { parseSyncInterval } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { FormGroup, SelectOption } from '@patternfly/react-core';
import {
  ReplicationType,
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '../../constants';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './utils/reducer';
import './create-dr-policy.scss';

export const MIN_VALUE = 1;

export const normalizeSyncTimeValue = (value: number) => {
  const syncTimeValue = isNaN(Number(value)) ? MIN_VALUE : Number(value);
  return syncTimeValue < MIN_VALUE ? MIN_VALUE : syncTimeValue;
};

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

export const SelectReplicationType: React.FC<SelectReplicationTypeProps> = ({
  selectedClusters,
  syncIntervalTime,
  replicationType,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  React.useEffect(() => {
    // Set replication type when two cluster are selected
    const cephFSID1 =
      selectedClusters[0]?.odfInfo?.storageClusterInfo?.cephFSID;
    const cephFSID2 =
      selectedClusters[1]?.odfInfo?.storageClusterInfo?.cephFSID;
    dispatch({
      type: DRPolicyActionType.SET_REPLICATION_TYPE,
      payload:
        cephFSID1 === cephFSID2 ? ReplicationType.SYNC : ReplicationType.ASYNC,
    });
  }, [selectedClusters, dispatch]);

  const replicationDropdownItems = Object.entries(
    REPLICATION_DISPLAY_TEXT(t)
  ).map((key, value) => (
    <SelectOption
      key={key[0]}
      id={key[0]}
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
      {replicationType === ReplicationType.ASYNC && (
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
  selectedClusters: ManagedClusterInfoType[];
  syncIntervalTime: string;
  replicationType: ReplicationType;
  dispatch: React.Dispatch<DRPolicyAction>;
};
