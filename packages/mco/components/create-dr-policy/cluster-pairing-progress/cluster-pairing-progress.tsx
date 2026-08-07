import * as React from 'react';
import {
  MirrorPeerPairingStatus,
  MirrorPeerPhase,
  MIRROR_PEER_PHASE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { getMirrorPeerResourceObj } from '@odf/mco/hooks';
import { MirrorPeerKind } from '@odf/mco/types';
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
import StatusIconAndText from '@odf/shared/status/StatusIconAndText';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidWatchK8sResourceObj } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateProps,
  EmptyStateVariant,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  ProgressVariant,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CogIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  deleteDRPolicyByName,
  deleteMirrorPeerByName,
} from '../utils/k8s-utils';
import {
  PairingSuccessEmptyState,
  type PairingSuccessProps,
} from './pairing-success-empty-state';
import '../create-dr-policy.scss';

const PROGRESS_STEP_MS = 450;
const READY_SUCCESS_HOLD_MS = 700;

const getErrorMessage = (error: unknown): string =>
  (error as Error)?.message || JSON.stringify(error);

type ClusterPairingProgressProps = PairingSuccessProps & {
  mirrorPeerName: string;
  policyName: string;
  deleteMirrorPeerOnCancel: boolean;
  deletePolicyOnCancel: boolean;
  onCancelPairing: () => void;
};

type PairingViewModel = {
  emptyStateIcon: EmptyStateProps['icon'];
  showInlineLoading: boolean;
  progressVariant?: ProgressVariant;
  showCancel: boolean;
  showErrorDetails: boolean;
  progressHelper?: string;
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
        emptyStateIcon: CogIcon,
        showInlineLoading: false,
        showCancel: false,
        showErrorDetails: false,
        progressHelper,
      };
    case MirrorPeerPairingStatus.FailedUnrecoverable:
      return {
        emptyStateIcon: ExclamationCircleIcon,
        showInlineLoading: false,
        progressVariant: ProgressVariant.danger,
        showCancel: true,
        showErrorDetails,
        progressHelper,
      };
    case MirrorPeerPairingStatus.FailedRecoverable:
      return {
        emptyStateIcon: CogIcon,
        showInlineLoading: true,
        showCancel: true,
        showErrorDetails,
        progressHelper,
      };
    case MirrorPeerPairingStatus.Progressing:
    default:
      return {
        emptyStateIcon: CogIcon,
        showInlineLoading: true,
        showCancel: true,
        showErrorDetails: false,
        progressHelper,
      };
  }
};

export const ClusterPairingProgress: React.FC<ClusterPairingProgressProps> = ({
  mirrorPeerName,
  policyName,
  deleteMirrorPeerOnCancel,
  deletePolicyOnCancel,
  onViewPolicy,
  onClose,
  onCancelPairing,
}) => {
  const { t } = useCustomTranslation();
  const [actionError, setActionError] = React.useState('');
  const [isCancelling, setIsCancelling] = React.useState(false);
  const cancelInFlightRef = React.useRef(false);
  const lastProgressPhaseRef = React.useRef<MirrorPeerPhase>(
    MirrorPeerPhase.Initializing
  );
  const [targetProgress, setTargetProgress] = React.useState(0);
  const [displayedProgress, setDisplayedProgress] = React.useState(0);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const [mirrorPeer, loaded, loadError] = useK8sWatchResource<MirrorPeerKind>(
    getValidWatchK8sResourceObj(
      getMirrorPeerResourceObj({ name: mirrorPeerName }),
      !!mirrorPeerName
    )
  );

  const readyMirrorPeerRef = React.useRef<MirrorPeerKind | undefined>(
    undefined
  );
  if (!readyMirrorPeerRef.current && isMirrorPeerReady(mirrorPeer)) {
    readyMirrorPeerRef.current = mirrorPeer;
  }
  const hasReachedReady = !!readyMirrorPeerRef.current;
  const displayedMirrorPeer = readyMirrorPeerRef.current ?? mirrorPeer;

  const phase = getMirrorPeerPhase(displayedMirrorPeer);
  const phaseMessage = getMirrorPeerMessage(displayedMirrorPeer);
  const condition = getMirrorPeerPrimaryCondition(displayedMirrorPeer);
  const pairingStatus = getMirrorPeerPairingStatus(displayedMirrorPeer);
  const view = getPairingViewModel(
    pairingStatus,
    phaseMessage,
    !!(condition?.reason || condition?.message)
  );

  React.useEffect(() => {
    if (phase && phase !== MirrorPeerPhase.Failed) {
      lastProgressPhaseRef.current = phase;
    }
    const next = getMirrorPeerProgressValue(
      displayedMirrorPeer,
      lastProgressPhaseRef.current
    );
    setTargetProgress((prev) => Math.max(prev, hasReachedReady ? 100 : next));
  }, [displayedMirrorPeer, phase, hasReachedReady]);

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

  React.useEffect(() => {
    if (!hasReachedReady || displayedProgress < 100) {
      return;
    }
    const timer = setTimeout(() => {
      setShowSuccess(true);
    }, READY_SUCCESS_HOLD_MS);
    return () => clearTimeout(timer);
  }, [hasReachedReady, displayedProgress]);

  const pendingCleanupRef = React.useRef({
    drPolicy: deletePolicyOnCancel && !!policyName,
    mirrorPeer: deleteMirrorPeerOnCancel && !!mirrorPeerName,
  });

  const onCancel = async () => {
    if (cancelInFlightRef.current) {
      return;
    }
    cancelInFlightRef.current = true;
    setActionError('');
    setIsCancelling(true);

    const pending = pendingCleanupRef.current;
    const errors: string[] = [];
    if (pending.drPolicy) {
      try {
        await deleteDRPolicyByName(policyName);
        pending.drPolicy = false;
      } catch (error) {
        errors.push(getErrorMessage(error));
      }
    }
    if (pending.mirrorPeer) {
      try {
        await deleteMirrorPeerByName(mirrorPeerName);
        pending.mirrorPeer = false;
      } catch (error) {
        errors.push(getErrorMessage(error));
      }
    }

    if (errors.length) {
      cancelInFlightRef.current = false;
      setIsCancelling(false);
      setActionError(errors.join(' '));
      return;
    }
    onCancelPairing();
  };

  if (!hasReachedReady && (!loaded || loadError)) {
    return (
      <div className="mco-create-data-policy__pairing">
        <StatusBox loaded={loaded} loadError={loadError} />
        {!!loadError && (
          <Button variant={ButtonVariant.link} onClick={onClose}>
            {t('Close')}
          </Button>
        )}
      </div>
    );
  }

  if (showSuccess) {
    return (
      <PairingSuccessEmptyState onViewPolicy={onViewPolicy} onClose={onClose} />
    );
  }

  const phaseDisplayText = MIRROR_PEER_PHASE_DISPLAY_TEXT(t);
  const progressTitle = phaseDisplayText[phase ?? MirrorPeerPhase.Initializing];
  const hideProgressTitle =
    view.showInlineLoading && pairingStatus !== MirrorPeerPairingStatus.Ready;

  return (
    <div className="mco-create-data-policy__pairing">
      <EmptyState
        headingLevel="h2"
        icon={view.emptyStateIcon}
        titleText={t('Cluster pairing in progress')}
        variant={EmptyStateVariant.lg}
        className="mco-create-data-policy__pairing-empty-state"
      >
        <EmptyStateBody>
          <Stack hasGutter className="mco-create-data-policy__pairing-stack">
            {view.showInlineLoading && (
              <StackItem>
                <StatusIconAndText
                  icon={<Spinner size="sm" />}
                  title={progressTitle}
                />
              </StackItem>
            )}
            <StackItem className="mco-create-data-policy__pairing-progress">
              <Progress
                value={displayedProgress}
                title={hideProgressTitle ? undefined : progressTitle}
                aria-label={hideProgressTitle ? progressTitle : undefined}
                helperText={view.progressHelper}
                measureLocation={ProgressMeasureLocation.top}
                size={ProgressSize.lg}
                variant={view.progressVariant}
              />
            </StackItem>
            {view.showCancel && (
              <StackItem className="mco-create-data-policy__pairing-cancel">
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
                <StackItem>
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
              <StackItem>
                <Alert
                  variant={AlertVariant.danger}
                  isInline
                  title={actionError}
                />
              </StackItem>
            )}
          </Stack>
        </EmptyStateBody>
      </EmptyState>
    </div>
  );
};
