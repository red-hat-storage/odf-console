import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
} from '@patternfly/react-core';

type PublicAccessBlockConfirmationProps = {
  onDisable: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  configText: string[];
};

const PublicAccessBlockConfirmation: React.FC<
  CommonModalProps<PublicAccessBlockConfirmationProps>
> = ({ closeModal, isOpen, extraProps: { onDisable, configText = [] } }) => {
  const { t } = useCustomTranslation();

  return (
    <Modal
      title={t('Confirm changes?')}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.small}
      actions={[
        <ButtonBar inProgress={false} errorMessage={null}>
          <span>
            <Button
              variant={ButtonVariant.danger}
              onClick={(event) => {
                onDisable(event);
                closeModal();
              }}
            >
              {t('Proceed to disable')}
            </Button>
            <Button variant={ButtonVariant.link} onClick={closeModal}>
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Content>
        <Content component="ul">
          <Content component={ContentVariants.p}>
            {t('You are about to disable')}
          </Content>
          {configText.map((text) => (
            <Content component="li" className="pf-v6-u-ml-md">
              <b>{text}</b>
            </Content>
          ))}
          <Content component={ContentVariants.p} className="pf-v6-u-mt-md">
            {t(
              "This action may expose the bucket's contents to the public and introduce potential risks. Are you sure you want to proceed?"
            )}
          </Content>
        </Content>
      </Content>
    </Modal>
  );
};

export default PublicAccessBlockConfirmation;
