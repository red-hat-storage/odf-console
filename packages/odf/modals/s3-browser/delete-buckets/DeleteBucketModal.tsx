import * as React from 'react';
import { CommonModalProps } from '@odf/shared/modals';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal } from '@patternfly/react-core';

type DeleteBucketModalProps = {
  bucketName: string;
};

const DeleteBucketModal: React.FC<CommonModalProps<DeleteBucketModalProps>> = ({
  closeModal,
  isOpen,
  extraProps: { bucketName },
}) => {
  const { t } = useCustomTranslation();
  return (
    <Modal
      title={t('Delete Bucket Modal')}
      isOpen={isOpen}
      onClose={closeModal}
    >
      {bucketName}
    </Modal>
  );
};

export default DeleteBucketModal;
