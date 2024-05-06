import * as React from 'react';
import { LoadingBox } from '@odf/shared';
import { ModalBody, ModalTitle } from '@odf/shared/generic/ModalTitle';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ExternalLink } from '@odf/shared/utils';
import { HttpError } from '@odf/shared/utils/error/http-error';
import {
  BlueInfoCircleIcon,
  StatusIconAndText,
  consoleFetch,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Trans } from 'react-i18next';
import {
  Modal,
  Button,
  ModalVariant,
  FlexItem,
  Flex,
  Alert,
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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const onCopyToClipboard = () => {
    navigator.clipboard.writeText(ticket);
  };

  React.useEffect(() => {
    setLoading(true);
    consoleFetch(
      '/api/proxy/plugin/odf-console/provider-proxy/onboarding-tokens',
      {
        method: 'post',
      }
    )
      .then((response) => {
        setLoading(false);
        if (!response.ok) {
          throw new Error('Network response is not ok!');
        }
        return response.text();
      })
      .then((text) => {
        setTicket(text);
      })
      .catch((err: HttpError) => {
        setLoading(false);
        setError(err.message);
      });
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.small}>
      <ModalTitle>{MODAL_TITLE}</ModalTitle>
      <ModalBody>
        <Flex direction={{ default: 'column' }}>
          <FlexItem grow={{ default: 'grow' }}>
            {ticket && !loading && (
              <div className="odf-onboarding-modal__text-area">{ticket}</div>
            )}
            {loading && !error && <LoadingBox />}
            {!loading && error && (
              <Alert
                variant="danger"
                isInline
                title={t('Can not generate an onboarding token at the moment')}
              >
                <Trans>
                  The token generation service is currently unavailable. Contact
                  our{' '}
                  <ExternalLink href="https://access.redhat.com/support/">
                    customer support
                  </ExternalLink>{' '}
                  for further help.
                </Trans>
              </Alert>
            )}
          </FlexItem>
          {!error && !loading && (
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
          )}
          <FlexItem>
            <Text component={TextVariants.h6}>
              {t('How to use this token?')}
            </Text>
            <Text>
              {t(
                'An onboarding token is needed to connect an additional OpenShift cluster to a Data Foundation deployment. Copy the generated token and use it for deploying Data Foundation client operator on your OpenShift cluster.'
              )}
            </Text>
          </FlexItem>
          <FlexItem>
            <StatusIconAndText
              title={t(
                'This token is valid for 48 hours and can only be used once.'
              )}
              icon={<BlueInfoCircleIcon />}
              className="text-muted"
            />
          </FlexItem>
        </Flex>
      </ModalBody>
    </Modal>
  );
};
