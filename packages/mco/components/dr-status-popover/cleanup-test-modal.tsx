import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { useToastWrapper } from '@odf/shared/hooks';
import { ModalBody, ModalFooter, CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage, referenceForModel } from '@odf/shared/utils';
import {
  k8sPatch,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { HUB_CLUSTER_NAME } from '../../constants';
import { DRPlacementControlKind } from '../../types';
import { isTestFailoverActive } from '../../utils/disaster-recovery';
import {
  getEndTestFailoverPatch,
  markTestDryRunCleared,
} from '../../utils/test-failover';

export type CleanUpTestModalProps = {
  drpcName: string;
  drpcNamespace: string;
  actionStartTime?: string;
  homeCluster?: string;
  lastAction?: string;
  peerCluster?: string;
  currentFailoverCluster?: string;
};

const CleanUpTestModal: React.FC<CommonModalProps<CleanUpTestModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: {
    drpcName,
    drpcNamespace,
    actionStartTime,
    homeCluster,
    lastAction,
    peerCluster = '',
    currentFailoverCluster = '',
  },
}) => {
  const { t } = useCustomTranslation();
  const addToast = useToastWrapper();
  const [isInProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  // Freeze session fields when Clean up opened — never learn later watch values.
  const [sessionStartTime] = React.useState(actionStartTime || '');
  const [sessionHomeCluster] = React.useState(homeCluster || '');
  // Preserve undefined (missing annotation) vs '' (Deployed).
  const [sessionLastAction] = React.useState(lastAction);
  const [sessionPeerCluster] = React.useState(peerCluster);
  const [sessionFailoverCluster] = React.useState(currentFailoverCluster);

  const drpcResource = React.useMemo(
    () => ({
      cluster: HUB_CLUSTER_NAME,
      name: drpcName,
      namespace: drpcNamespace,
      kind: referenceForModel(DRPlacementControlModel),
      namespaced: true,
    }),
    [drpcName, drpcNamespace]
  );
  const [drpc, loaded, loadError] =
    useK8sWatchResource<DRPlacementControlKind>(drpcResource);
  const watchedStartTime = drpc?.status?.actionStartTime || '';

  const endPatches =
    sessionStartTime && sessionHomeCluster
      ? getEndTestFailoverPatch({
          homeCluster: sessionHomeCluster,
          actionStartTime: sessionStartTime,
          lastAction: sessionLastAction,
          peerCluster: sessionPeerCluster,
          currentFailoverCluster: sessionFailoverCluster,
        })
      : null;

  const onClose = () => {
    if (!isInProgress) {
      closeModal();
    }
  };

  React.useEffect(() => {
    if (!loaded || loadError || isInProgress) return;

    const closeWithInfo = (title: string) => {
      addToast({
        variant: AlertVariant.info,
        title,
        content: '',
        dismissible: true,
        timeout: true,
      });
      closeModal();
    };

    if (!sessionStartTime || !sessionHomeCluster) {
      closeWithInfo(
        t('Clean up is unavailable because the test session is incomplete.')
      );
      return;
    }
    // Same hold exit rules as Convert: require dryRun so we do not stay open
    // after Clean up / Convert has already patched.
    if (!drpc || !drpc.spec?.dryRun || !isTestFailoverActive(drpc)) {
      closeWithInfo(
        t('Clean up is no longer available because the test hold has ended.')
      );
      return;
    }
    if (watchedStartTime && watchedStartTime !== sessionStartTime) {
      closeWithInfo(
        t(
          'Clean up is no longer available because a newer test session is in progress.'
        )
      );
    }
  }, [
    addToast,
    closeModal,
    drpc,
    isInProgress,
    loadError,
    loaded,
    sessionHomeCluster,
    sessionStartTime,
    t,
    watchedStartTime,
  ]);

  const onCleanUp = () => {
    if (!endPatches) return;
    setInProgress(true);
    setErrorMessage('');
    k8sPatch({
      model: DRPlacementControlModel,
      resource: { metadata: { name: drpcName, namespace: drpcNamespace } },
      data: endPatches,
    })
      .then(() => {
        markTestDryRunCleared(drpcNamespace, drpcName, sessionStartTime);
        addToast({
          variant: 'success',
          title: t('Clean up test started'),
        });
        closeModal();
      })
      .catch((error) => {
        setInProgress(false);
        setErrorMessage(getErrorMessage(error));
      });
  };

  const canCleanUp =
    !!endPatches &&
    !!sessionStartTime &&
    !!sessionHomeCluster &&
    loaded &&
    !loadError &&
    !!drpc?.spec?.dryRun &&
    isTestFailoverActive(drpc) &&
    (!watchedStartTime || watchedStartTime === sessionStartTime);

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Clean up test?')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalBody>
        {t(
          'This removes the test workload from the target cluster and restores the pre-test placement. Production workloads are not moved.'
        )}
        {(errorMessage || loadError) && (
          <Alert
            className="pf-v6-u-mt-md"
            isInline
            variant={AlertVariant.danger}
            title={t('An error occurred')}
          >
            {errorMessage || getErrorMessage(loadError)}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant={ButtonVariant.link}
          onClick={onClose}
          isDisabled={isInProgress}
          data-test="cancel-action"
        >
          {t('Cancel')}
        </Button>
        <Button
          variant={ButtonVariant.primary}
          onClick={onCleanUp}
          isLoading={isInProgress}
          isDisabled={isInProgress || !canCleanUp}
          data-test="cleanup-action"
        >
          {t('Clean up test')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CleanUpTestModal;
