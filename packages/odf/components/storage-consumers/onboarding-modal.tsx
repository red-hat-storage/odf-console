import * as React from 'react';
import { LoadingBox } from '@odf/shared';
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
  const [ticket, setTicket] = React.useState('');

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(ticket);
  };

  React.useEffect(() => {
    consoleFetch(
      '/api/proxy/plugin/odf-console/provider-proxy/onboarding-tokens',
      {
        method: 'post',
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response is not ok!');
        }
        return response.text();
      })
      .then((text) => {
        setTicket(text);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Provider proxy is not working as expected', error);
      });
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.small}>
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <ModalBody>
        <Flex direction={{ default: 'column' }}>
          <FlexItem grow={{ default: 'grow' }}>
            {ticket ? (
              <div className="odf-onboarding-modal__text-area">{ticket}</div>
            ) : (
              <LoadingBox />
            )}
          </FlexItem>
          <FlexItem>
            <Button
              type="button"
              onClick={onCopyToClipboard}
              variant="link"
              className="pf-m-link--align-left odf-onboarding-modal__clipboard"
            >
              <ClipboardIcon />
              {t('Copy to clipboard')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Text component={TextVariants.h6}>
              {t('How to use this token?')}
            </Text>
            <Text>
              {t(
                'To onboard the client cluster, the provider cluster requires the onboarding token.'
              )}
            </Text>
            <Text>
              {t(
                'An onboarding token is needed to connect an additional OpenShift cluster to a Data Foundation deployment.'
              )}
            </Text>
          </FlexItem>
        </Flex>
      </ModalBody>
    </Modal>
  );
};
