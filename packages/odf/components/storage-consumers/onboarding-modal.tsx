import * as React from 'react';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import {
  Modal,
  Button,
  ModalVariant,
  FlexItem,
  Flex,
} from '@patternfly/react-core';
import { Text, TextVariants } from '@patternfly/react-core';
import { ClipboardIcon } from '@patternfly/react-icons';
import './onboarding-modal.scss';

type ClientOnBoardingModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const ClientOnBoardingModal: ClientOnBoardingModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const MODAL_TITLE = t('Client onboarding token');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ticket, _setTicket] = React.useState('dummy--text');
  // Todo(bipuladh): Add a HTTP request to proxy to get ticket

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(ticket);
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.small}>
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <ModalBody>
        <Flex direction={{ default: 'column' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <div className="odf-onboarding-modal__text-area">{ticket}</div>
          </FlexItem>
          <FlexItem>
            <Button
              type="button"
              onClick={onCopyToClipboard}
              variant="link"
              className="pf-m-link--align-left odf-onboarding-modal__clipboard"
            >
              <ClipboardIcon />
              Copy to Clipboard
            </Button>
          </FlexItem>
          <FlexItem>
            <Text component={TextVariants.h6}>How to use this token?</Text>
            <Text>Short explanation</Text>
          </FlexItem>
          <FlexItem>
            <Text>
              This token is valid for 48 hours and can only be used once
            </Text>
          </FlexItem>
        </Flex>
      </ModalBody>
    </Modal>
  );
};
