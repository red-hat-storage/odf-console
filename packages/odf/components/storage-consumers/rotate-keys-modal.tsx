import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { ModalFooter } from '@odf/shared/generic';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { SecretModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sDelete } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Button, FlexItem, Flex } from '@patternfly/react-core';
import { useODFNamespaceSelector } from '../../redux';

type RotateKeysModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const RotateKeysModal: RotateKeysModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const { odfNamespace } = useODFNamespaceSelector();
  const MODAL_TITLE = t('Rotate signing keys');
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>(null);

  const onRotate = () => {
    setProgress(true);
    k8sDelete({
      model: SecretModel,
      resource: {
        metadata: {
          name: 'onboarding-ticket-key',
          namespace: odfNamespace,
        },
      },
    })
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setProgress(false);
        setError(err);
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <NamespaceSafetyBox>
        <ModalBody>
          <Flex direction={{ default: 'column' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <div>
                {t(
                  'This action will rotate the signing key currently used for generating and validating client onboarding tokens.'
                )}
              </div>
              <div>
                {t(
                  'Upon rotation, the existing signing key will be revoked and replaced with a new one.'
                )}
              </div>
            </FlexItem>
          </Flex>
        </ModalBody>
        <ModalFooter inProgress={inProgress} errorMessage={error?.message}>
          <Flex direction={{ default: 'row' }}>
            <FlexItem>
              <Button variant="secondary" onClick={() => closeModal()}>
                {t('Cancel')}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button onClick={() => onRotate()}>{t('Confirm')}</Button>
            </FlexItem>
          </Flex>
        </ModalFooter>
      </NamespaceSafetyBox>
    </Modal>
  );
};
