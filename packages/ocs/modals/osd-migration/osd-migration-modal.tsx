import * as React from 'react';
import { DISASTER_RECOVERY_TARGET_ANNOTATION } from '@odf/core/constants';
import { CommonModalProps, ModalBody, ModalFooter } from '@odf/shared/modals';
import { OCSStorageClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { StorageClusterKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant, Button, Alert } from '@patternfly/react-core';

export const OSDMigrationModal: React.FC<OSDMigrationModalProps> = ({
  isOpen,
  extraProps,
  closeModal,
}) => {
  const { t } = useCustomTranslation();
  const ocsData = extraProps?.ocsData;
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const handleOptimize = () => {
    const patch = [
      {
        op: 'add',
        path: `metadata/annotations/${DISASTER_RECOVERY_TARGET_ANNOTATION}`,
        value: 'true',
      },
    ];

    k8sPatch({
      model: OCSStorageClusterModel,
      resource: {
        metadata: {
          name: getName(ocsData),
          namespace: getNamespace(ocsData),
        },
      },
      data: patch,
    })
      .then(() => {
        closeModal();
      })
      .catch((err) => {
        setErrorMessage(err.message);
      });
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Optimise cluster for Regional-DR?')}
      isOpen={isOpen}
      onClose={closeModal}
    >
      {t(
        'Configure the cluster for a Regional-DR setup by migrating OSDs. Migration may take some time depending on several factors. To learn more about OSDs migration best practices and its consequences refer to the documentation.'
      )}
      {/* TODO: Show doc link once ViewDocumentation moved to shared */}
      <ModalBody>
        {!!errorMessage && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {errorMessage}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button key="close" variant="secondary" onClick={closeModal}>
          {t('Close')}
        </Button>
        <Button key="optimize" variant="primary" onClick={handleOptimize}>
          {t('Optimise')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type OSDMigrationModalProps = CommonModalProps<{
  ocsData: StorageClusterKind;
}>;

export default OSDMigrationModal;
