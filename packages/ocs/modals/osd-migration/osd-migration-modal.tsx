import * as React from 'react';
import { DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH } from '@odf/core/constants';
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
  onMigrationStart, // prop to notify when migration starts
}) => {
  const { t } = useCustomTranslation();
  const ocsData = extraProps?.ocsData;
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const handleOptimize = () => {
    onMigrationStart();
    const patch = [
      {
        op: 'add',
        path: `/metadata/annotations/${DISASTER_RECOVERY_TARGET_ANNOTATION_WO_SLASH}`,
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

  const handleClose = () => {
    closeModal();
  };

  return (
    <Modal
      variant={ModalVariant.small}
      title={t('Prepare the cluster for Regional DR setup')}
      isOpen={isOpen}
      onClose={handleClose}
    >
      {t(
        'To prepare the cluster for Regional DR setup, you must migrate the OSDs. Migrating OSDs may take some time to complete based on your cluster.'
      )}
      <ModalBody>
        {!!errorMessage && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {errorMessage}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button key="close" variant="secondary" onClick={closeModal}>
          {t('Cancel')}
        </Button>
        <Button key="optimize" variant="primary" onClick={handleOptimize}>
          {t('Yes, migrate OSDs')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export type OSDMigrationModalProps = CommonModalProps & {
  extraProps: {
    ocsData: StorageClusterKind;
  };
  onMigrationStart: () => void;
};

export default OSDMigrationModal;
