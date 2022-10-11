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
import { isPeerReady } from '../../../utils';
import {
  ACTION_TYPE,
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
  t: TFunction
): StatusProps =>
  peerReadiness.text !== 'Not ready'
    ? isPeerReady(drpcState?.drPolicyControl)
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
  const lastSyncTime = drpcState?.drPolicyControl?.status?.lastGroupSyncTime;
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
  t: TFunction
) =>
  // Verify all DRPC has Peer ready status
  drpcStateList?.reduce(
    (acc, drpcState) =>
      subsGroups.includes(getName(drpcState?.drPolicyControl))
        ? {
            ...acc,
            peerReadiness: getPeerReadiness(acc.peerReadiness, drpcState, t),
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
  action,
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [peerStatus, setPeerStatus] = React.useState<StatusType>(
    initalPeerStatus(t)
  );
  const setErrorMessage = React.useCallback(
    (errorMessage: string) => {
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
    if (!!state.selectedSubsGroups.length) {
      const peerCurrentStatus = getPeerStatusSummary(
        state?.drPolicyControlState,
        state?.selectedSubsGroups,
        t
      );
      peerCurrentStatus.peerReadiness.text === PEER_READINESS(t).PEER_NOT_READY
        ? setErrorMessage(
            t(
              '{{actionType}} cannot be initiated becuase peer is not in ready state.',
              { actionType: action }
            )
          )
        : setErrorMessage('');
      setPeerStatus(peerCurrentStatus);
    } else {
      // Default peer status is Unknown
      setPeerStatus(initalPeerStatus(t));
    }
  }, [
    state.selectedSubsGroups,
    state.drPolicyControlState,
    action,
    t,
    setPeerStatus,
    setErrorMessage,
    dispatch,
  ]);

  return (
    <>
      <Flex>
        <FlexItem>
          <strong> {t('{{action}} readiness:', { action })} </strong>
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
  action: ACTION_TYPE;
  dispatch: React.Dispatch<FailoverAndRelocateAction>;
};
