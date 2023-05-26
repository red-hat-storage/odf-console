import * as React from 'react';
import {
  getLatestDate,
  utcDateTimeFormatterWithTimeZone,
} from '@odf/shared/details-page/datetime';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  StatusIconAndText,
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { Flex, FlexItem } from '@patternfly/react-core';
import { UnknownIcon } from '@patternfly/react-icons';
import { DRActionType } from '../../../../constants';
import { checkDRActionReadiness } from '../../../../utils';
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
    icon: <UnknownIcon />,
    text: PEER_READINESS(t).UNKNOWN,
  },
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
    ? dataLastSyncStatus.text !== 'Unknown'
      ? {
          text: getLatestDate([dataLastSyncStatus.text, lastSyncTime]),
        }
      : {
          text: lastSyncTime,
        }
    : dataLastSyncStatus;
};

const getFormatedDateTime = (dateTime: string) =>
  dateTime !== 'Unknown'
    ? utcDateTimeFormatterWithTimeZone.format(new Date(dateTime))
    : dateTime;

const getPeerStatusSummary = (
  drpcStateList: DRPolicyControlState[],
  subsGroups: string[],
  actionType: DRActionType,
  t: TFunction
) =>
  // Verify all DRPC has Peer ready status
  drpcStateList?.reduce(
    (acc, drpcState) =>
      subsGroups.includes(getName(drpcState?.drPlacementControl))
        ? {
            ...acc,
            peerReadiness: getPeerReadiness(
              acc.peerReadiness,
              drpcState,
              actionType,
              t
            ),
            dataLastSyncedOn: getDataLastSyncTime(
              acc.dataLastSyncedOn,
              drpcState
            ),
          }
        : acc,
    initalPeerStatus(t)
  );

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
  const { selectedSubsGroups, drPolicyControlState, actionType } = state;
  const [peerStatus, setPeerStatus] = React.useState<StatusType>(
    initalPeerStatus(t)
  );
  const setErrorMessage = React.useCallback(
    (errorMessage: ErrorMessageType) => {
      dispatch({
        type: FailoverAndRelocateType.SET_ERROR_MESSAGE,
        payload: {
          peerStatusErrorMessage: errorMessage,
        },
      });
    },
    [dispatch]
  );

  React.useEffect(() => {
    if (!!selectedSubsGroups.length) {
      const peerCurrentStatus = getPeerStatusSummary(
        drPolicyControlState,
        selectedSubsGroups,
        actionType,
        t
      );
      peerCurrentStatus.peerReadiness.text === PEER_READINESS(t).PEER_NOT_READY
        ? setErrorMessage(
            actionType === DRActionType.FAILOVER
              ? ErrorMessageType.FAILOVER_READINESS_CHECK_FAILED
              : ErrorMessageType.RELOCATE_READINESS_CHECK_FAILED
          )
        : setErrorMessage(0 as ErrorMessageType);
      setPeerStatus(peerCurrentStatus);
    } else {
      // Default peer status is Unknown
      setPeerStatus(initalPeerStatus(t));
      setErrorMessage(0 as ErrorMessageType);
    }
  }, [
    selectedSubsGroups,
    drPolicyControlState,
    actionType,
    t,
    setPeerStatus,
    setErrorMessage,
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
          <strong> {t('Data last synced on:')} </strong>
        </FlexItem>
        <FlexItem>
          <StatusIconAndText
            title={getFormatedDateTime(peerStatus?.dataLastSyncedOn?.text)}
            icon={peerStatus?.dataLastSyncedOn?.icon}
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
