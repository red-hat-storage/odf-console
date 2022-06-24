import * as React from 'react';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { useTranslation } from 'react-i18next';
import { Modal, ModalVariant } from '@patternfly/react-core';
import CreateBackingStoreForm from './create-bs';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const CreateBackingStoreFormModal: React.FC<CreateBackingStoreFormModalProps> =
  (props) => {
    const { t } = useTranslation();
    const { isOpen, closeModal } = props;

    const Header = (
      <ModalHeader>
        {t('plugin__odf-console~Create new BackingStore')}
      </ModalHeader>
    );
    return (
      <Modal isOpen={isOpen} variant={ModalVariant.small} header={Header}>
        <div className="nb-endpoints__modal">
          <ModalBody>
            <p>
              {t(
                'plugin__odf-console~BackingStore represents a storage target to be used as the underlying storage for the data in Multicloud Object Gateway buckets.'
              )}
            </p>
            <CreateBackingStoreForm
              onClose={closeModal}
              onCancel={closeModal}
            />
          </ModalBody>
        </div>
      </Modal>
    );
  };

type CreateBackingStoreFormModalProps = CommonModalProps & {
  namespace?: string;
};

export default CreateBackingStoreFormModal;
