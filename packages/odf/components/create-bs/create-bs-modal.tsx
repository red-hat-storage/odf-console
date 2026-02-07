import * as React from 'react';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import CreateBackingStoreForm from './create-bs';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const CreateBackingStoreFormModal: React.FC<
  CreateBackingStoreFormModalProps
> = (props) => {
  const { t } = useCustomTranslation();
  const { isOpen, closeModal } = props;

  const Header = <ModalHeader>{t('Create new BackingStore')}</ModalHeader>;
  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.small}
      header={Header}
      onClose={closeModal}
    >
      <div className="nb-endpoints__modal">
        <ModalHeader>{t('Create new BackingStore')}</ModalHeader>
        <ModalBody>
          <p>
            {t(
              'BackingStore represents a storage target to be used as the underlying storage for the data in Multicloud Object Gateway buckets.'
            )}
          </p>
          <CreateBackingStoreForm onClose={closeModal} onCancel={closeModal} />
        </ModalBody>
      </div>
    </Modal>
  );
};

type CreateBackingStoreFormModalProps = CommonModalProps & {
  namespace?: string;
};

export default CreateBackingStoreFormModal;
