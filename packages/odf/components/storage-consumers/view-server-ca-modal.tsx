import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { ConfigMapKind, ConfigMapModel } from '@odf/shared';
import { LoadingInline } from '@odf/shared/generic';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  AlertGroup,
  AlertVariant,
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  TextArea,
} from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import { useODFNamespaceSelector } from '../../redux';

// OpenShift injects this configmap into the operator namespace.
// The provider and client operators read the same name and key.
const SERVICE_CA_CONFIG_MAP = 'openshift-service-ca.crt';
const SERVICE_CA_DATA_KEY = 'service-ca.crt';

type ViewServerCAModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const ViewServerCAModal: ViewServerCAModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
  const [serverCA, setServerCA] = React.useState('');
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState<Error>(null);
  const [copyCount, setCopyCount] = React.useState(0);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!isOpen || !isNsSafe || !odfNamespace) {
      return;
    }
    let active = true;
    setLoaded(false);
    setError(null);
    setServerCA('');
    k8sGet<ConfigMapKind>({
      model: ConfigMapModel,
      name: SERVICE_CA_CONFIG_MAP,
      ns: odfNamespace,
    })
      .then((configMap) => {
        if (!active) {
          return;
        }
        const certificate = configMap.data?.[SERVICE_CA_DATA_KEY]?.trim();
        if (!certificate) {
          setError(new Error());
          return;
        }
        setServerCA(certificate);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err : new Error(err?.message || ''));
      })
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [isOpen, isNsSafe, odfNamespace, retryCount]);

  const onCopy = () => {
    if (!serverCA) {
      return;
    }
    navigator.clipboard.writeText(serverCA).then(() => {
      setCopyCount((count) => count + 1);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      variant={ModalVariant.medium}
      aria-label={t('Server CA')}
      header={
        <div>
          <h1 className="pf-v6-c-modal-box__title pf-v6-u-font-weight-normal pf-v6-u-mb-sm">
            {t('Server CA')}
          </h1>
          <Content component={ContentVariants.small} className="pf-v6-u-mb-md">
            {t(
              'A CA used to authenticate and securely a OpenShift cluster StorageClient to the StorageConsumers on this cluster.'
            )}
          </Content>
        </div>
      }
      actions={[
        <Button
          key="copy"
          variant={ButtonVariant.primary}
          icon={<CopyIcon />}
          onClick={onCopy}
          isDisabled={!serverCA}
          data-test="copy-server-ca"
        >
          {t('Copy to clipboard')}
        </Button>,
        <Button
          key="cancel"
          variant={ButtonVariant.secondary}
          onClick={() => closeModal()}
        >
          {t('Cancel')}
        </Button>,
      ]}
    >
      <NamespaceSafetyBox>
        {loaded && error ? (
          <Alert
            variant={AlertVariant.warning}
            isInline
            title={t('Server CA unavailable')}
            actionLinks={
              <AlertActionLink
                onClick={() => setRetryCount((count) => count + 1)}
              >
                {t('Try again')}
              </AlertActionLink>
            }
          >
            {t('Unable to access the Server CA. Try again later.')}
          </Alert>
        ) : (
          <TextArea
            value={serverCA}
            readOnly
            readOnlyVariant="default"
            resizeOrientation="vertical"
            rows={7}
            isDisabled={!serverCA}
          />
        )}
        {!loaded && (
          <div className="pf-v6-u-mt-md">
            <LoadingInline />
          </div>
        )}
      </NamespaceSafetyBox>
      {copyCount > 0 && (
        <AlertGroup isToast isLiveRegion appendTo={() => document.body}>
          <Alert
            key={copyCount}
            variant={AlertVariant.info}
            title={t('Server CA copied to clipboard.')}
            timeout
            onTimeout={() => setCopyCount(0)}
            actionClose={
              <AlertActionCloseButton onClose={() => setCopyCount(0)} />
            }
          />
        </AlertGroup>
      )}
    </Modal>
  );
};
