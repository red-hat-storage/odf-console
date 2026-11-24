import * as React from 'react';
import { useModalWrapper } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  Content,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { BellIcon } from '@patternfly/react-icons';
import {
  clearTestDryRunPending,
  getEndTestFailoverPatch,
  isTestDryRunClearPending,
} from '../../utils/test-failover';

export const ConvertTestFailoverModal = React.lazy(
  () => import('./convert-test-failover-modal')
);
export const CleanUpTestModal = React.lazy(
  () => import('./cleanup-test-modal')
);

type TestFailoverHoldAlertProps = {
  drpcName?: string;
  drpcNamespace?: string;
  homeCluster?: string;
  peerCluster?: string;
  actionStartTime?: string;
  // Pre-test action from Ramen last-action; chooses clean-up restore shape.
  lastAction?: string;
  // False once Convert or Clean up is patched, until Ramen leaves the hold.
  dryRun?: boolean;
  currentFailoverCluster?: string;
  // Closes the DR status popover before an external modal opens.
  onConvert?: () => void;
  onCleanUp?: () => void;
};

export const TestFailoverHoldAlert: React.FC<TestFailoverHoldAlertProps> = ({
  drpcName,
  drpcNamespace,
  homeCluster,
  peerCluster = '',
  actionStartTime = '',
  lastAction,
  dryRun,
  currentFailoverCluster = '',
  onConvert: onConvertLaunched,
  onCleanUp: onCleanUpLaunched,
}) => {
  const { t } = useCustomTranslation();
  const launcher = useModalWrapper();
  const canPatch = !!drpcName && !!drpcNamespace && !!dryRun;
  const hasSession = !!actionStartTime;
  const dryRunClearPending = isTestDryRunClearPending(
    drpcNamespace,
    drpcName,
    actionStartTime
  );

  React.useEffect(() => {
    if (!dryRun && dryRunClearPending) {
      clearTestDryRunPending(drpcNamespace, drpcName, actionStartTime);
    }
  }, [actionStartTime, dryRun, dryRunClearPending, drpcName, drpcNamespace]);

  // After Convert/Clean up clears dryRun, Ramen may still sit on the hold for a
  // few watches. The watched DRPC can still say dryRun until that update
  // arrives. Show a wait message instead of Convert / Clean up buttons.
  if (!dryRun || dryRunClearPending) {
    return (
      <FlexItem>
        <Content component="p">
          {t(
            'Your request is being processed. This may take a few moments. No further action is needed.'
          )}
        </Content>
      </FlexItem>
    );
  }

  const endPatches =
    canPatch && hasSession && homeCluster
      ? getEndTestFailoverPatch({
          homeCluster,
          actionStartTime,
          lastAction,
          peerCluster,
          currentFailoverCluster,
        })
      : null;

  // Disabled when home cluster is missing or restore patch is unsafe.
  const canCleanUp = canPatch && hasSession && !!homeCluster && !!endPatches;
  const canConvert = canPatch && hasSession;
  const cleanUpDisabledReason =
    canPatch && hasSession && !homeCluster
      ? t(
          'The application deployment cluster could not be resolved from the placement decision or DRPlacementControl. Check the application placement and try again.'
        )
      : canPatch && hasSession && !!homeCluster && !endPatches
        ? t(
            'Clean up is unavailable because the pre-test placement cannot be restored. Check the DRPlacementControl last-action annotation and peer cluster.'
          )
        : undefined;

  const onConvert = () => {
    if (!canConvert) return;
    onConvertLaunched?.();
    launcher(ConvertTestFailoverModal, {
      isOpen: true,
      extraProps: { drpcName, drpcNamespace, actionStartTime },
    });
  };

  const onCleanUp = () => {
    if (!canCleanUp) return;
    onCleanUpLaunched?.();
    launcher(CleanUpTestModal, {
      isOpen: true,
      extraProps: {
        drpcName,
        drpcNamespace,
        actionStartTime,
        homeCluster,
        lastAction,
        peerCluster,
        currentFailoverCluster,
      },
    });
  };

  const convertLabel = t('Convert to real failover');
  const cleanUpLabel = t('Clean up test');

  const cleanUpButton = (
    <Button
      variant={ButtonVariant.primary}
      isDisabled={!canCleanUp}
      onClick={onCleanUp}
    >
      {cleanUpLabel}
    </Button>
  );

  return (
    <FlexItem>
      <Alert
        variant={AlertVariant.custom}
        customIcon={<BellIcon />}
        isInline
        title={t('Test failover requires action')}
      >
        <Content component="p">
          {t(
            'The workloads are secured in both clusters. To conclude the test failover session, proceed with {{cleanUp}}. If required, you can {{convert}} to make the failover permanent.',
            { cleanUp: cleanUpLabel, convert: convertLabel }
          )}
        </Content>
        <Flex
          className="pf-v6-u-mt-sm"
          flexWrap={{ default: 'nowrap' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <Button
            variant={ButtonVariant.warning}
            isDisabled={!canConvert}
            onClick={onConvert}
          >
            {convertLabel}
          </Button>
          {cleanUpButton}
        </Flex>
        {cleanUpDisabledReason && (
          <HelperText className="pf-v6-u-mt-sm">
            <HelperTextItem variant="warning">
              {cleanUpDisabledReason}
            </HelperTextItem>
          </HelperText>
        )}
      </Alert>
    </FlexItem>
  );
};
