import * as React from 'react';
import { DRPlacementControlModel } from '@odf/shared';
import { ModalBody, ModalFooter, CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getErrorMessage } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
} from '@patternfly/react-core';
import { getPromoteTestFailoverPatch } from '../../utils/test-failover';

export type ConvertTestFailoverModalProps = {
  drpcName: string;
  drpcNamespace: string;
};

const ConvertTestFailoverModal: React.FC<
  CommonModalProps<ConvertTestFailoverModalProps>
> = ({ closeModal, isOpen, extraProps: { drpcName, drpcNamespace } }) => {
  const { t } = useCustomTranslation();
  const [isInProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const onConvert = () => {
    setInProgress(true);
    setErrorMessage('');
    k8sPatch({
      model: DRPlacementControlModel,
      resource: { metadata: { name: drpcName, namespace: drpcNamespace } },
      data: getPromoteTestFailoverPatch(),
    })
      .then(closeModal)
      .catch((error) => {
        setInProgress(false);
        setErrorMessage(getErrorMessage(error));
      });
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Convert to real failover')}
      titleIconVariant="warning"
      description={t('Recommended only when the primary cluster is down.')}
      isOpen={isOpen}
      onClose={closeModal}
    >
      <ModalBody>
        {t(
          'Converting to Real Failover transitions the workload to the selected target cluster and stops active replication between clusters.'
        )}
        {errorMessage && (
          <Alert
            className="pf-v6-u-mt-md"
            isInline
            variant={AlertVariant.danger}
            title={t('An error occurred')}
          >
            {errorMessage}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant={ButtonVariant.link}
          onClick={closeModal}
          isDisabled={isInProgress}
          data-test="cancel-action"
        >
          {t('Cancel')}
        </Button>
        <Button
          variant={ButtonVariant.warning}
          onClick={onConvert}
          isLoading={isInProgress}
          isDisabled={isInProgress}
          data-test="convert-action"
        >
          {t('Convert')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConvertTestFailoverModal;
