import * as React from 'react';
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
import { findPeerCondition } from '../../../utils';
import {
  ACTION_TYPE,
  FailoverAndRelocateState,
  FailoverAndRelocateAction,
  FailoverAndRelocateType,
  DRPolicyControlState,
} from './reducer';

export const PEER_READINESS = {
  UNKNOWN: 'Unknown',
  PEER_READY: 'Peer ready',
  PEER_NOT_READY: 'Peer not ready',
};

const initalPeerStatus = (t: TFunction) => ({
  peerReadiness: {
    icon: <UnknownIcon />,
    text: t('Unknown'),
  },
  lastHealthCheck: {
    icon: <UnknownIcon />,
    text: t('Unknown'),
  },
  lastSnapshotTakenOn: {
    icon: <UnknownIcon />,
    text: t('Unknown'),
  },
});

const getPeerReadiness = (
  obj: StatusType,
  drpcState: DRPolicyControlState,
  t: TFunction
): StatusProps =>
  obj.peerReadiness.text !== PEER_READINESS.PEER_NOT_READY
    ? findPeerCondition(drpcState?.drPolicyControl)
      ? {
          text: t('Peer ready'),
          icon: <GreenCheckCircleIcon />,
        }
      : {
          text: t('Peer not ready'),
          icon: <RedExclamationCircleIcon />,
        }
    : obj.peerReadiness;

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
            peerReadiness: getPeerReadiness(acc, drpcState, t),
          }
        : acc,
    initalPeerStatus(t)
  );

type StatusProps = {
  icon: JSX.Element;
  text: string;
};

type StatusType = {
  peerReadiness: StatusProps;
  lastHealthCheck: StatusProps;
  lastSnapshotTakenOn: StatusProps;
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
      peerCurrentStatus.peerReadiness.text === PEER_READINESS.PEER_NOT_READY
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
          <strong> {t('Last HealthCheck:')} </strong>
        </FlexItem>
        <FlexItem>
          <StatusIconAndText
            title={peerStatus?.lastHealthCheck?.text}
            icon={peerStatus?.lastHealthCheck?.icon}
          />
        </FlexItem>
      </Flex>
      <Flex>
        <FlexItem>
          <strong> {t('Data last synced on:')} </strong>
        </FlexItem>
        <FlexItem>
          <StatusIconAndText
            title={peerStatus?.lastSnapshotTakenOn?.text}
            icon={peerStatus?.lastSnapshotTakenOn?.icon}
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
