import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import {
  SERVICE_CA_CONFIG_MAP,
  SERVICE_CA_DATA_KEY,
} from '@odf/core/constants';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { ConfigMapKind, ConfigMapModel } from '@odf/shared';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useToast } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  AlertVariant,
  Button,
  ButtonVariant,
  Content,
  ContentVariants,
  TextArea,
} from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';

type ViewServerCAModalProps = ModalComponent<{
  isOpen: boolean;
}>;

export const ViewServerCAModal: ViewServerCAModalProps = ({
  isOpen,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const { addToast, removeToast } = useToast();
  const toastIdRef = React.useRef<string | undefined>(undefined);
  const [configMap, loaded, loadError] = useSafeK8sWatchResource<ConfigMapKind>(
    (namespace) => ({
      kind: ConfigMapModel.kind,
      name: SERVICE_CA_CONFIG_MAP,
      namespace,
      isList: false,
    })
  );
  const serverCA = configMap?.data?.[SERVICE_CA_DATA_KEY]?.trim() ?? '';

  const onCopy = () => {
    if (!serverCA) {
      return;
    }
    navigator.clipboard.writeText(serverCA).then(() => {
      if (toastIdRef.current) {
        removeToast(toastIdRef.current);
      }
      toastIdRef.current = addToast({
        title: t('Server CA copied to clipboard.'),
        variant: AlertVariant.info,
        content: '',
        dismissible: true,
        timeout: true,
      });
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
      <NamespaceSafetyBox
        areResourcesLoaded={loaded}
        resourcesError={loadError}
      >
        <TextArea
          value={serverCA}
          readOnly
          readOnlyVariant="default"
          resizeOrientation="vertical"
          rows={7}
          isDisabled={!serverCA}
        />
      </NamespaceSafetyBox>
    </Modal>
  );
};
