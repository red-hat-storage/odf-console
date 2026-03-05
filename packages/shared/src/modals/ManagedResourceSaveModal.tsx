import * as React from 'react';
import {
  ResourceLink,
  K8sResourceCommon,
  OwnerReference,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import { Trans } from 'react-i18next';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForOwnerRef } from '../utils';
import { ModalBody, ModalFooter, ModalHeader, CommonModalProps } from './Modal';

const header = (t: TFunction) => (
  <ModalHeader>
    <ExclamationTriangleIcon
      color="var(--pf-t--global--color--status--warning--100)"
      className="icon--spacer"
    />
    {t('Managed resource')}
  </ModalHeader>
);

const ManagedResourceSaveModal: React.FC<ManagedResourceSaveModalProps> = ({
  closeModal,
  isOpen,
  extraProps: { onSubmit, resource, owner },
}) => {
  const submit = (event) => {
    event.preventDefault();
    onSubmit();
    closeModal();
  };

  const { t } = useCustomTranslation();
  return (
    <Modal
      position="top"
      variant={ModalVariant.small}
      header={header(t)}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
    >
      <ModalBody>
        <Trans t={t}>
          This resource is managed by{' '}
          <ResourceLink
            className="modal__inline-resource-link"
            inline
            kind={referenceForOwnerRef(owner)}
            name={owner.name}
            namespace={resource.metadata.namespace}
          />{' '}
          and any modifications may be overwritten. Edit the managing resource
          to preserve changes.
        </Trans>
      </ModalBody>
      <ModalFooter>
        <Button key="Save" variant={ButtonVariant.primary} onClick={submit}>
          {t('Save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type ManagedResourceSaveModalProps = {
  extraProps: {
    onSubmit: () => void;
    resource: K8sResourceCommon;
    owner: OwnerReference;
  };
} & CommonModalProps;

export default ManagedResourceSaveModal;
