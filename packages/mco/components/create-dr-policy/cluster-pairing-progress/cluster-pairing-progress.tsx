import * as React from 'react';
import {
  MirrorPeerPairingStatus,
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
  MIRROR_PEER_PHASE_DISPLAY_TEXT,
  MIRROR_PEER_PHASE_MESSAGE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { DRPolicyKind, MirrorPeerKind } from '@odf/mco/types';
import {
  getMirrorPeerMessage,
  getMirrorPeerPairingStatus,
  getMirrorPeerPhase,
  getMirrorPeerPrimaryCondition,
  getMirrorPeerProgressValue,
  getNextMirrorPeerProgressMilestone,
  isMirrorPeerReady,
} from '@odf/mco/utils';
import { StatusBox } from '@odf/shared/generic/status-box';
import { getName } from '@odf/shared/selectors';
import { RedExclamationCircleIcon } from '@odf/shared/status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Bullseye,
  Button,
  ButtonVariant,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  ProgressVariant,
  Spinner,
  spinnerSize,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  deleteDRPolicyByName,
  deleteMirrorPeerByName,
  restoreDRPolicySpec,
} from '../utils/k8s-utils';
import { PairingSuccess, type PairingSuccessProps } from './pairing-success';
import '../create-dr-policy.scss';

const PROGRESS_STEP_MS = 450;
const SUCCESS_HOLD_MS = 1000;

const getErrorMessage = (error: unknown): string =>
  (error as Error)?.message || JSON.stringify(error);

type ClusterPairingProgressProps = PairingSuccessProps & {
  mirrorPeerName: string;
  mirrorPeers?: MirrorPeerKind[];
  mirrorPeersLoaded: boolean;
  mirrorPeersLoadError: unknown;
  policyName: string;
  deleteMirrorPeerOnCancel: boolean;
  deletePolicyOnCancel: boolean;
  previousPolicySpec?: DRPolicyKind['spec'];
  onCancelPairing: () => void;
};

type PairingViewModel = {
  progressVariant?: ProgressVariant;
  showCancel: boolean;
  showErrorDetails: boolean;
  progressHelper?: string;
  isFailedUnrecoverable: boolean;
};

const getPairingViewModel = (
  status: MirrorPeerPairingStatus,
  phaseMessage: string,
  hasConditionDetails: boolean
): PairingViewModel => {
  const progressHelper = phaseMessage || undefined;
  const showErrorDetails = hasConditionDetails;

  switch (status) {
    case MirrorPeerPairingStatus.Ready:
      return {
        showCancel: false,
        showErrorDetails: false,
        progressHelper,
        isFailedUnrecoverable: false,
      };
    case MirrorPeerPairingStatus.FailedUnrecoverable:
      return {
        progressVariant: ProgressVariant.danger,
        showCancel: true,
        showErrorDetails,
        progressHelper,
        isFailedUnrecoverable: true,
      };
    case MirrorPeerPairingStatus.FailedRecoverable:
      return {
        showCancel: true,
        showErrorDetails,
        progressHelper,
        isFailedUnrecoverable: false,
      };
    case MirrorPeerPairingStatus.Progressing:
    default:
      return {
        showCancel: true,
        showErrorDetails: false,
        progressHelper,
        isFailedUnrecoverable: false,
      };
  }
};

export const ClusterPairingProgress: React.FC<ClusterPairingProgressProps> = ({
  mirrorPeerName,
  mirrorPeers,
  mirrorPeersLoaded: loaded,
  mirrorPeersLoadError: loadError,
  policyName,
  deleteMirrorPeerOnCancel,
  deletePolicyOnCancel,
  previousPolicySpec,
  onViewPolicy,
  onClose,
  onCancelPairing,
}) => {
  const { t } = useCustomTranslation();
  const [actionError, setActionError] = React.useState('');
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const lastProgressPhaseRef = React.useRef<MirrorPeerPhase>(
    MirrorPeerPhase.Initializing
  );
  const [displayedProgress, setDisplayedProgress] = React.useState(0);

  // Newly created peers may be absent from the parent list briefly after create.
  const mirrorPeer = mirrorPeers?.find((mp) => getName(mp) === mirrorPeerName);

  const hasReachedReady = isMirrorPeerReady(mirrorPeer);

  const phase = getMirrorPeerPhase(mirrorPeer);
  const phaseMessage = getMirrorPeerMessage(mirrorPeer);
  const phaseMessageDisplay =
    MIRROR_PEER_PHASE_MESSAGE_DISPLAY_TEXT(t)[
      phaseMessage as MirrorPeerPhaseMessage
    ] || phaseMessage;
  const condition = getMirrorPeerPrimaryCondition(mirrorPeer);
  const pairingStatus = getMirrorPeerPairingStatus(mirrorPeer);
  const view = getPairingViewModel(
    pairingStatus,
    phaseMessageDisplay,
    !!(condition?.reason || condition?.message)
  );

  if (phase && phase !== MirrorPeerPhase.Failed) {
    lastProgressPhaseRef.current = phase;
  }
  const targetProgress = hasReachedReady
    ? 100
    : getMirrorPeerProgressValue(mirrorPeer, lastProgressPhaseRef.current);

  React.useEffect(() => {
    if (displayedProgress >= targetProgress) {
      return;
    }
    const timer = setTimeout(() => {
      setDisplayedProgress((prev) =>
        getNextMirrorPeerProgressMilestone(prev, targetProgress)
      );
    }, PROGRESS_STEP_MS);
    return () => clearTimeout(timer);
  }, [displayedProgress, targetProgress]);

  // After Ready, hold at 100% briefly, then show the success page.
  React.useEffect(() => {
    if (hasReachedReady && displayedProgress >= 100) {
      const timer = setTimeout(() => setShowSuccess(true), SUCCESS_HOLD_MS);
      return () => clearTimeout(timer);
    }
  }, [hasReachedReady, displayedProgress]);

  const pendingCleanupRef = React.useRef({
    restorePolicy: !!previousPolicySpec && !!policyName,
    drPolicy: deletePolicyOnCancel && !!policyName && !previousPolicySpec,
    mirrorPeer: deleteMirrorPeerOnCancel && !!mirrorPeerName,
  });

  const onCancel = async () => {
    if (isCancelling) {
      return;
    }
    setActionError('');
    setIsCancelling(true);

    const pending = pendingCleanupRef.current;
    const errors: string[] = [];
    let policyCleanupFailed = false;
    if (pending.restorePolicy) {
      try {
        await restoreDRPolicySpec(policyName, previousPolicySpec);
        pending.restorePolicy = false;
      } catch (error) {
        policyCleanupFailed = true;
        errors.push(getErrorMessage(error));
      }
    } else if (pending.drPolicy) {
      try {
        await deleteDRPolicyByName(policyName);
        pending.drPolicy = false;
      } catch (error) {
        policyCleanupFailed = true;
        errors.push(getErrorMessage(error));
      }
    }
    // Only delete MirrorPeer after policy cleanup succeeds so retry can still
    // remove the peer once restore/delete has completed.
    if (!policyCleanupFailed && pending.mirrorPeer) {
      try {
        await deleteMirrorPeerByName(mirrorPeerName);
        pending.mirrorPeer = false;
      } catch (error) {
        errors.push(getErrorMessage(error));
      }
    }

    if (errors.length) {
      setIsCancelling(false);
      setActionError(errors.join(' '));
      return;
    }
    onCancelPairing();
  };

  if (!hasReachedReady && (!loaded || loadError)) {
    return (
      <Bullseye className="mco-create-data-policy__pairing pf-v6-u-p-xl">
        <StatusBox loaded={loaded} loadError={loadError} />
        {!!loadError && (
          <Button variant={ButtonVariant.link} onClick={onClose}>
            {t('Close')}
          </Button>
        )}
      </Bullseye>
    );
  }

  if (showSuccess) {
    return <PairingSuccess onViewPolicy={onViewPolicy} onClose={onClose} />;
  }

  const phaseDisplayText = MIRROR_PEER_PHASE_DISPLAY_TEXT(t);
  const progressTitle = phaseDisplayText[phase ?? MirrorPeerPhase.Initializing];
  const statusIcon = view.isFailedUnrecoverable ? (
    <RedExclamationCircleIcon
      className="mco-create-data-policy__pairing-status-icon"
      title="Error"
    />
  ) : (
    <Spinner size={spinnerSize.xl} aria-label={t('Pairing in progress')} />
  );

  return (
    <Bullseye className="mco-create-data-policy__pairing pf-v6-u-p-xl">
      <Stack hasGutter className="pf-v6-u-w-50">
        <StackItem className="pf-v6-u-text-align-center">
          {statusIcon}
        </StackItem>
        <StackItem className="pf-v6-u-text-align-center">
          <Title headingLevel="h2" size="lg">
            {t('Cluster pairing in progress')}
          </Title>
        </StackItem>
        <StackItem className="mco-create-data-policy__pairing-progress">
          <Progress
            value={displayedProgress}
            title={progressTitle}
            helperText={view.progressHelper}
            measureLocation={ProgressMeasureLocation.top}
            size={ProgressSize.lg}
            variant={view.progressVariant}
          />
        </StackItem>
        {view.showCancel && (
          <StackItem className="pf-v6-u-text-align-center">
            <Button
              variant={ButtonVariant.link}
              isDisabled={isCancelling}
              isLoading={isCancelling}
              onClick={onCancel}
            >
              {t('Cancel')}
            </Button>
          </StackItem>
        )}
        {view.showErrorDetails &&
          !!(condition?.reason || condition?.message) && (
            <StackItem className="pf-v6-u-text-align-start">
              <Alert
                variant={AlertVariant.danger}
                isInline
                title={
                  condition?.reason
                    ? t('Error Reason: {{reason}}', {
                        reason: condition.reason,
                      })
                    : t('Error Message: {{message}}', {
                        message: condition.message,
                      })
                }
              >
                {condition?.reason && condition?.message
                  ? t('Error Message: {{message}}', {
                      message: condition.message,
                    })
                  : undefined}
              </Alert>
            </StackItem>
          )}
        {actionError && (
          <StackItem className="pf-v6-u-text-align-start">
            <Alert variant={AlertVariant.danger} isInline title={actionError} />
          </StackItem>
        )}
      </Stack>
    </Bullseye>
  );
};
