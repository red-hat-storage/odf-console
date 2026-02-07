import * as React from 'react';
import { useApplicationFromPAV } from '@odf/mco/hooks/use-application-pav';
import { ProtectedApplicationViewKind } from '@odf/mco/types/pav';
import { CommonModalProps } from '@odf/shared/modals';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Bullseye, Spinner, Alert } from '@patternfly/react-core';
import { AppManagePoliciesModal } from '../app-manage-policies/app-manage-policies-modal';

type AppManagePoliciesModalWrapperProps = {
  pav: ProtectedApplicationViewKind;
};

export const AppManagePoliciesModalWrapper: React.FC<
  CommonModalProps<AppManagePoliciesModalWrapperProps>
> = ({ isOpen, closeModal, extraProps: { pav } }) => {
  const { application, loaded, error } = useApplicationFromPAV(pav);

  if (!loaded || error || !application) {
    return (
      <Modal
        variant={ModalVariant.small}
        isOpen={isOpen}
        onClose={closeModal}
        title="Manage disaster recovery"
      >
        {!loaded ? (
          <Bullseye>
            <Spinner size="lg" />
          </Bullseye>
        ) : (
          <Alert variant="danger" title="Failed to fetch application">
            {error?.message}
          </Alert>
        )}
      </Modal>
    );
  }

  return (
    <AppManagePoliciesModal
      resource={application}
      isOpen={isOpen}
      close={closeModal}
    />
  );
};
