import * as React from 'react';
import { ModalFooter } from '@odf/shared';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import {
  Modal,
  Button,
  ModalVariant,
  FlexItem,
  Flex,
} from '@patternfly/react-core';

type RotateKeysModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const RotateKeysModal: RotateKeysModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const MODAL_TITLE = t('Rotate signing keys');
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>(null);

  const onRotate = () => {
    setProgress(true);
    consoleFetch('/api/proxy/plugin/odf-console/provider-proxy/rotate-keys', {
      method: 'post',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response is not ok!');
        }
        return response.text();
      })
      .then(() => {
        setProgress(false);
      })
      .catch((err) => {
        setProgress(false);
        setError(err);
      });
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.medium}>
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
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
    </Modal>
  );
};
