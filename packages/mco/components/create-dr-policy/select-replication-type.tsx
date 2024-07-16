import * as React from 'react';
import { DRPolicyKind } from '@odf/mco/types';
import { getReplicationType, parseSyncInterval } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { TFunction } from 'i18next';
import {
  FormGroup,
  Alert,
  AlertVariant,
  SelectOption,
} from '@patternfly/react-core';
import {
  REPLICATION_TYPE,
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '../../constants';
import {
  DRPolicyAction,
  DRPolicyActionType,
  ManagedClusterInfoType,
} from './reducer';
import '../../style.scss';

export const MIN_VALUE = 1;

export const normalizeSyncTimeValue = (value: number) => {
  const syncTimeValue = isNaN(Number(value)) ? MIN_VALUE : Number(value);
  return syncTimeValue < MIN_VALUE ? MIN_VALUE : syncTimeValue;
};

const checkSyncPolicyAlreadyExists = (
  drPolicies: DRPolicyKind[],
  selectedClusters: string[]
): boolean =>
  drPolicies.some((drPolicy) => {
    const { drClusters, schedulingInterval } = drPolicy.spec;
    const isSyncPolicy =
      getReplicationType(schedulingInterval) === REPLICATION_TYPE.SYNC;
    return (
      isSyncPolicy &&
      drClusters.every((cluster) => selectedClusters.includes(cluster))
    );
  });

const getClusterErrorInfo = (
  selectedClusters: ManagedClusterInfoType[]
): ClusterErrorType =>
  selectedClusters.reduce(
    (acc, cluster) => {
      const { isValidODFVersion, storageClusterInfo } = cluster?.odfInfo || {};
      if (!cluster.isManagedClusterAvailable) {
        acc.unavailableClusters.push(cluster.name);
      }
      if (!storageClusterInfo?.storageSystemNamespacedName) {
        acc.clustersWithUnsupportedODF.push(cluster.name);
      }
      if (!isValidODFVersion) {
        acc.clustersWithoutODF.push(cluster.name);
      }
      if (!storageClusterInfo?.cephFSID) {
        acc.clustersWithUnsuccessfulODF.push(cluster.name);
      }
      return acc;
    },
    {
      unavailableClusters: [],
      clustersWithUnsupportedODF: [],
      clustersWithoutODF: [],
      clustersWithUnsuccessfulODF: [],
    }
  );

const getErrorMessage = (
  selectedClusters: ManagedClusterInfoType[],
  requiredODFVersion: string,
  isSyncPolicyFound: boolean,
  t: TFunction
): ErrorMessageType => {
  const clusterErrorInfo = getClusterErrorInfo(selectedClusters);
  if (isSyncPolicyFound) {
    return {
      message: t('Existing DRPolicy detected'),
      description: t(
        'A DRPolicy is already configured for selected managed clusters. You cannot create another DRPolicy using the same pair of clusters.'
      ),
    };
  } else if (!!clusterErrorInfo.unavailableClusters.length) {
    return {
      message: t('1 or more managed clusters are offline'),
      description: t(
        'The status for both the managed clusters must be available for creating a DR policy. To restore a cluster to an available state, refer to the instructions in the ACM documentation.'
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithUnsupportedODF.length) {
    return {
      message: t('Cannot proceed with one or more selected clusters'),
      description: t(
        'We could not retrieve any information about the managed cluster {{names}}. Check the documentation for potential causes and follow the steps mentioned and try again.',
        { names: clusterErrorInfo.clustersWithUnsupportedODF.join(' & ') }
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithoutODF.length) {
    return {
      message: t(
        '{{ names }} has either an unsupported Data Foundation version or the Data Foundation operator is missing, install or update to Data Foundation {{ version }} or the latest version to enable DR protection.',
        {
          names: clusterErrorInfo.clustersWithoutODF.join(' & '),
          version: requiredODFVersion,
        }
      ),
    };
  } else if (!!clusterErrorInfo.clustersWithUnsuccessfulODF.length) {
    return {
      message: t('{{ names }} is not connected to RHCS', {
        names: clusterErrorInfo.clustersWithUnsuccessfulODF.join(' & '),
      }),
    };
  }
  return null;
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
      name={t('Sync schedule')}
      onChange={onChange}
      dropdownUnits={SyncScheduleFormat}
      defaultRequestSizeUnit={unitVal}
      defaultRequestSizeValue={interval.toString()}
      minValue={MIN_VALUE}
    />
  );
};

export const DRReplicationType: React.FC<DRReplicationTypeProps> = ({
  selectedClusters,
  syncIntervalTime,
  replicationType,
  requiredODFVersion,
  drPolicies,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const isSyncPolicyFound =
    replicationType === REPLICATION_TYPE.SYNC &&
    checkSyncPolicyAlreadyExists(
      drPolicies,
      selectedClusters.map((cluster) => cluster.name)
    );

  const errorMessage = getErrorMessage(
    selectedClusters,
    requiredODFVersion,
    isSyncPolicyFound,
    t
  );

  React.useEffect(() => {
    if (selectedClusters.length === 2) {
      // DR replication type
      const cephFSIDs = selectedClusters.reduce((acc, cluster) => {
        const { storageClusterInfo } = cluster?.odfInfo || {};
        if (storageClusterInfo?.cephFSID !== '') {
          acc.add(storageClusterInfo?.cephFSID);
        }
        return acc;
      }, new Set());
      dispatch({
        type: DRPolicyActionType.SET_REPLICATION_TYPE,
        payload:
          cephFSIDs.size <= 1 ? REPLICATION_TYPE.SYNC : REPLICATION_TYPE.ASYNC,
      });
    } else {
      dispatch({
        type: DRPolicyActionType.SET_REPLICATION_TYPE,
        payload: null,
      });
    }
  }, [selectedClusters, dispatch]);

  const replicationDropdownItems = Object.entries(
    REPLICATION_DISPLAY_TEXT(t)
  ).map((key, value) => (
    <SelectOption
      key={key}
      id={key}
      data-test="replication-dropdown-item"
      value={value}
    />
  ));

  const onChange = (replType: REPLICATION_TYPE) =>
    dispatch({
      type: DRPolicyActionType.SET_REPLICATION_TYPE,
      payload: replType,
    });

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
          {replicationType && (
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
          )}
          {replicationType === REPLICATION_TYPE.ASYNC && (
            <FormGroup label={t('Sync schedule')}>
              <SyncSchedule
                syncIntervalTime={syncIntervalTime}
                dispatch={dispatch}
              />
            </FormGroup>
          )}
        </>
      )}
    </>
  );
};

type SyncScheduleProps = {
  syncIntervalTime: string;
  dispatch: React.Dispatch<DRPolicyAction>;
};

type DRReplicationTypeProps = {
  selectedClusters: ManagedClusterInfoType[];
  syncIntervalTime: string;
  replicationType: REPLICATION_TYPE;
  requiredODFVersion: string;
  drPolicies: DRPolicyKind[];
  dispatch: React.Dispatch<DRPolicyAction>;
};

type ClusterErrorType = {
  unavailableClusters: string[];
  clustersWithUnsupportedODF: string[];
  clustersWithoutODF: string[];
  clustersWithUnsuccessfulODF: string[];
};

type ErrorMessageType = {
  message?: string;
  description?: string;
};
