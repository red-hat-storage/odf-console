import * as React from 'react';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { CreateDRPolicyForm } from './CreateDRPolicyForm';

export interface CreateDRPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedClusters?: string[];
}

export const CreateDRPolicyModal: React.FC<CreateDRPolicyModalProps> = ({
  isOpen,
  onClose,
  preSelectedClusters = [],
}) => {
  const { t } = useCustomTranslation();

  const handleSuccess = () => {
    onClose();
    // Optionally show a success notification here
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="create-drpolicy-modal-title"
      aria-describedby="create-drpolicy-modal-description"
    >
      <ModalHeader
        title={t('Create DRPolicy')}
        description={
          <Content component={ContentVariants.small}>
            {t(
              'Get a quick recovery in a remote or secondary cluster with a disaster recovery (DR) policy'
            )}
          </Content>
        }
      />
      <ModalBody>
        <CreateDRPolicyForm
          preSelectedClusters={preSelectedClusters}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </ModalBody>
    </Modal>
  );
};
