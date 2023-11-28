import * as React from 'react';
import { parseSyncInterval } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { SelectOption } from '@patternfly/react-core/next';
import { FormGroup, Alert, AlertVariant } from '@patternfly/react-core';
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

const MIN_SYNC_INTERVAL_TIME = 1;

const SyncSchedule: React.FC<SyncScheduleProps> = ({
  syncIntervalTime,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const SyncScheduleFormat = SYNC_SCHEDULE_DISPLAY_TEXT(t);
  const [unitVal, inerval] = parseSyncInterval(syncIntervalTime);

  const onChange = (event) => {
    const { value, unit } = event;
    const syncTime = isNaN(+value) ? MIN_SYNC_INTERVAL_TIME : Number(value);
    const normalizedSyncTime =
      syncTime < MIN_SYNC_INTERVAL_TIME ? MIN_SYNC_INTERVAL_TIME : syncTime;
    dispatch({
      type: DRPolicyActionType.SET_SYNC_INTERVAL_TIME,
      payload: `${normalizedSyncTime}${unit}`,
    });
  };

  return (
    <RequestSizeInput
      name={t('Sync schedule')}
      onChange={onChange}
      dropdownUnits={SyncScheduleFormat}
      defaultRequestSizeUnit={unitVal}
      defaultRequestSizeValue={inerval.toString()}
      minValue={MIN_SYNC_INTERVAL_TIME}
      unitText=""
    />
  );
};

const getClusterErrorInfo = (
  selectedClusters: ManagedClusterInfoType[]
): ClusterErrorType =>
  selectedClusters.reduce(
    (acc, cluster) => {
      const { isValidODFVersion, odfConfigInfo } = cluster?.odfInfo || {};
      const storageCluster = odfConfigInfo?.[0];
      if (!cluster.isManagedClusterAvailable) {
        acc.unAvailableClusters.push(cluster.name);
      }
      if (!storageCluster?.storageSystem) {
        acc.clustersWithUnSupportedODF.push(cluster.name);
      }
      if (!isValidODFVersion) {
        acc.clustersWithoutODF.push(cluster.name);
      }
      if (!storageCluster?.cephFSID) {
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
  selectedClusters: ManagedClusterInfoType[],
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
  selectedClusters,
  syncIntervalTime,
  replicationType,
  requiredODFVersion,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const errorMessage = React.useMemo(
    () => getErrorMessage(selectedClusters, requiredODFVersion, t),
    [selectedClusters, requiredODFVersion, t]
  );

  React.useEffect(() => {
    if (selectedClusters.length === 2) {
      // DR replication type
      const cephFSIDs = selectedClusters.reduce((acc, cluster) => {
        const { odfConfigInfo } = cluster?.odfInfo || {};
        const storageCluster = odfConfigInfo?.[0];
        if (storageCluster?.cephFSID !== '') {
          acc.add(storageCluster?.cephFSID);
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

  const replicationDropdownItems = Object.keys(REPLICATION_DISPLAY_TEXT(t)).map(
    (replType) => (
      <SelectOption
        key={replType}
        id={replType}
        data-test="replication-dropdown-item"
        value={REPLICATION_DISPLAY_TEXT(t)[replType]}
      />
    )
  );

  const onChange = (replType: string) =>
    dispatch({
      type: DRPolicyActionType.SET_REPLICATION_TYPE,
      payload: replType as REPLICATION_TYPE,
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
  dispatch: React.Dispatch<DRPolicyAction>;
};

type ClusterErrorType = {
  unAvailableClusters: string[];
  clustersWithUnSupportedODF: string[];
  clustersWithoutODF: string[];
  clustersWithUnSuccessfulODF: string[];
};

type ErrorMessageType = {
  message?: string;
  description?: string;
};
