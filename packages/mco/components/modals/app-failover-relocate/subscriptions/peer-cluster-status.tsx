import * as React from 'react';
import { getLatestDate } from '@odf/shared/details-page/datetime';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import { Flex, FlexItem } from '@patternfly/react-core';
import { UnknownIcon } from '@patternfly/react-icons';
import {
  DRActionType,
  ReplicationType,
  VolumeReplicationHealth,
} from '../../../../constants';
import {
  checkDRActionReadiness,
  getReplicationHealth,
} from '../../../../utils';
import { DateTimeFormat } from '../failover-relocate-modal-body';
import { ErrorMessageType } from './error-messages';
import {
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  DRPolicyControlState,
} from './reducer';

export const PEER_READINESS = (t: TFunction) => ({
  UNKNOWN: t('Unknown'),
  PEER_READY: t('Ready'),
  PEER_NOT_READY: t('Not ready'),
});

const initalPeerStatus = (t: TFunction) => ({
  peerReadiness: {
    icon: <UnknownIcon />,
    text: PEER_READINESS(t).UNKNOWN,
  },
  dataLastSyncedOn: {
    text: '',
  },
  replicationHealth: VolumeReplicationHealth.HEALTHY,
});

const getPeerReadiness = (
  peerReadiness: StatusProps,
  drpcState: DRPolicyControlState,
  actionType: DRActionType,
  t: TFunction
): StatusProps =>
  peerReadiness.text !== 'Not ready'
    ? checkDRActionReadiness(drpcState?.drPlacementControl, actionType)
      ? {
          text: PEER_READINESS(t).PEER_READY,
          icon: <GreenCheckCircleIcon />,
        }
      : {
          text: PEER_READINESS(t).PEER_NOT_READY,
          icon: <RedExclamationCircleIcon />,
        }
    : peerReadiness;

const getDataLastSyncTime = (
  dataLastSyncStatus: StatusProps,
  drpcState: DRPolicyControlState
): StatusProps => {
  const lastSyncTime = drpcState?.drPlacementControl?.status?.lastGroupSyncTime;
  return !!lastSyncTime
    ? !!dataLastSyncStatus.text
      ? {
          text: getLatestDate([dataLastSyncStatus.text, lastSyncTime]),
        }
      : {
          text: lastSyncTime,
        }
    : dataLastSyncStatus;
};

const getPeerStatusSummary = (
  drpcStateList: DRPolicyControlState[],
  subsGroups: string[],
  actionType: DRActionType,
  schedulingInterval: string,
  t: TFunction,
  replicationType: ReplicationType
) =>
  drpcStateList?.reduce((acc, drpcState) => {
    const drPlacementControl = drpcState?.drPlacementControl;

    if (subsGroups.includes(getName(drPlacementControl))) {
      const lastGroupSyncTime = drPlacementControl?.status?.lastGroupSyncTime;
      const higherSeverityHealth = getHigherSeverityHealth(
        acc.replicationHealth,
        lastGroupSyncTime,
        schedulingInterval,
        replicationType
      );

      return {
        ...acc,
        peerReadiness: getPeerReadiness(
          acc.peerReadiness,
          drpcState,
          actionType,
          t
        ),
        dataLastSyncedOn: getDataLastSyncTime(acc.dataLastSyncedOn, drpcState),
        replicationHealth: higherSeverityHealth,
      };
    }
    return acc;
  }, initalPeerStatus(t));

const getHigherSeverityHealth = (
  previousHealth: VolumeReplicationHealth,
  lastGroupSyncTime: string,
  schedulingInterval: string,
  replicationType: ReplicationType
): VolumeReplicationHealth => {
  const currentHealth = getReplicationHealth(
    lastGroupSyncTime,
    schedulingInterval,
    replicationType
  );

  if (
    [
      VolumeReplicationHealth.CRITICAL,
      VolumeReplicationHealth.WARNING,
    ].includes(currentHealth)
  ) {
    return currentHealth;
  }
  return previousHealth;
};

type StatusProps = {
  icon?: JSX.Element;
  text: string;
};

type StatusType = {
  peerReadiness: StatusProps;
  dataLastSyncedOn: StatusProps;
};

export const PeerClusterStatus: React.FC<PeerClusterStatusProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const {
    selectedSubsGroups,
    drPolicyControlState,
    actionType,
    selectedDRPolicy,
  } = state;
  const [peerStatus, setPeerStatus] = React.useState<StatusType>(
    initalPeerStatus(t)
  );

  const setPeerStatusMessage = React.useCallback(
    (errorMessage: ErrorMessageType) => {
      dispatch({
        type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
        payload: {
          peerStatusErrorMessage: errorMessage,
        },
      });
      return;
    },
    [dispatch]
  );

  const setSyncDelayMessage = React.useCallback(
    (errorMessage: ErrorMessageType) => {
      dispatch({
        type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
        payload: {
          syncDelayWarningMessage: errorMessage,
        },
      });
      return;
    },
    [dispatch]
  );

  React.useEffect(() => {
    if (!!selectedSubsGroups.length) {
      const peerCurrentStatus = getPeerStatusSummary(
        drPolicyControlState,
        selectedSubsGroups,
        actionType,
        selectedDRPolicy.schedulingInterval,
        t,
        selectedDRPolicy.replicationType
      );
      if (
        peerCurrentStatus.peerReadiness.text ===
        PEER_READINESS(t).PEER_NOT_READY
      ) {
        setPeerStatusMessage(
          actionType === DRActionType.FAILOVER
            ? ErrorMessageType.FAILOVER_READINESS_CHECK_FAILED
            : ErrorMessageType.RELOCATE_READINESS_CHECK_FAILED
        );
      } else {
        setPeerStatusMessage(0 as ErrorMessageType);
      }

      if (
        !!peerCurrentStatus.replicationHealth &&
        [
          VolumeReplicationHealth.CRITICAL,
          VolumeReplicationHealth.WARNING,
        ].includes(
          peerCurrentStatus.replicationHealth as VolumeReplicationHealth
        )
      ) {
        setSyncDelayMessage(
          actionType === DRActionType.FAILOVER
            ? ErrorMessageType.VOLUME_SYNC_DELAY_FAILOVER
            : ErrorMessageType.VOLUME_SYNC_DELAY_RELOCATE
        );
      } else {
        setSyncDelayMessage(0 as ErrorMessageType);
      }
      setPeerStatus(peerCurrentStatus);
    } else {
      // Default peer status is Unknown
      setPeerStatus(initalPeerStatus(t));
      setPeerStatusMessage(0 as ErrorMessageType);
      setSyncDelayMessage(0 as ErrorMessageType);
    }
  }, [
    selectedSubsGroups,
    selectedDRPolicy.schedulingInterval,
    selectedDRPolicy.replicationType,
    drPolicyControlState,
    actionType,
    t,
    setPeerStatus,
    setPeerStatusMessage,
    setSyncDelayMessage,
    dispatch,
  ]);

  return (
    <>
      <Flex>
        <FlexItem>
          <strong>
            {' '}
            {t('{{actionType}} readiness:', {
              actionType: state.actionType,
            })}{' '}
          </strong>
        </FlexItem>
        <FlexItem>
          <StatusIconAndText
            title={peerStatus?.peerReadiness?.text}
            icon={peerStatus?.peerReadiness?.icon}
          />
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>
          <strong> {t('Volume last synced on:')} </strong>
        </FlexItem>
        <FlexItem>
          <DateTimeFormat
            dateTime={peerStatus?.dataLastSyncedOn?.text}
            className=""
          />
        </FlexItem>
      </Flex>
    </>
  );
};

type PeerClusterStatusProps = {
  state: FailoverAndRelocateState;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};
