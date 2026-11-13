import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
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
import { getPromoteTestFailoverPatch } from '../../utils/test-failover';

export type ConvertTestFailoverModalProps = {
  drpcName: string;
  drpcNamespace: string;
  actionStartTime?: string;
};

const ConvertTestFailoverModal: React.FC<
  CommonModalProps<ConvertTestFailoverModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { drpcName, drpcNamespace, actionStartTime },
}) => {
  const { t } = useCustomTranslation();
  const [isInProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  // Bind only to the start time present when Convert opened. Never learn a
  // later value from watch — that could belong to a different test session.
  const [sessionStartTime] = React.useState(actionStartTime || '');
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

  const onClose = () => {
    if (!isInProgress) {
      closeModal();
    }
  };

  React.useEffect(() => {
    if (!loaded || loadError || isInProgress) return;
    if (!sessionStartTime) {
      closeModal();
      return;
    }
    // Clean up clears dryRun before progression leaves TestingFailover.
    // isTestFailoverActive stays true in that gap, so require dryRun too.
    if (!drpc || !drpc.spec?.dryRun || !isTestFailoverActive(drpc)) {
      closeModal();
      return;
    }
    if (watchedStartTime && watchedStartTime !== sessionStartTime) {
      closeModal();
    }
  }, [
    closeModal,
    drpc,
    isInProgress,
    loadError,
    loaded,
    sessionStartTime,
    watchedStartTime,
  ]);

  const onConvert = () => {
    if (!sessionStartTime) return;
    setInProgress(true);
    setErrorMessage('');
    k8sPatch({
      model: DRPlacementControlModel,
      resource: { metadata: { name: drpcName, namespace: drpcNamespace } },
      data: getPromoteTestFailoverPatch(sessionStartTime),
    })
      .then(closeModal)
      .catch((error) => {
        setInProgress(false);
        setErrorMessage(getErrorMessage(error));
      });
  };

  const canConvert =
    !!sessionStartTime &&
    loaded &&
    !loadError &&
    !!drpc?.spec?.dryRun &&
    isTestFailoverActive(drpc) &&
    (!watchedStartTime || watchedStartTime === sessionStartTime);

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Convert to real failover')}
      titleIconVariant="warning"
      description={t('Recommended only when the primary cluster is down.')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalBody>
        {t(
          'Promotes the test application already running on the target cluster to production and makes the failover permanent.'
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
          variant={ButtonVariant.warning}
          onClick={onConvert}
          isLoading={isInProgress}
          isDisabled={isInProgress || !canConvert}
          data-test="convert-action"
        >
          {t('Convert')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConvertTestFailoverModal;
