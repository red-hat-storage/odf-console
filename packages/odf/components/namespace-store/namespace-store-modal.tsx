import * as React from 'react';
import { CommonModalProps } from '@odf/shared/modals/common';
import { ModalBody } from '@odf/shared/modals/Modal';
import { useTranslation } from 'react-i18next';
import { Modal } from '@patternfly/react-core';
import NamespaceStoreForm from './namespace-store-form';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const NamespaceStoreModal: React.FC<NamespaceStoreModalProps> = (props) => {
  const { t } = useTranslation();
  const {
    isOpen,
    closeModal,
    extraProps: { namespace },
  } = props;

  return (
    <Modal isOpen={isOpen} onClose={closeModal}>
      <div className="nb-endpoints__modal">
        <ModalBody>
          <p>
            {t(
              'Represents an underlying storage to be used as read or write target for the data in the namespace buckets.'
            )}
          </p>
          <NamespaceStoreForm
            namespace={namespace}
            onCancel={() => close()}
            redirectHandler={() => close()}
          />
        </ModalBody>
      </div>
    </Modal>
  );
};

type NamespaceStoreModalProps = CommonModalProps<{
  namespace: string;
}>;

export default NamespaceStoreModal;
