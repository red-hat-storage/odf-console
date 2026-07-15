import * as React from 'react';
import { SAN_STORAGE_SYSTEM_NAME } from '@odf/core/constants';
import useIsSANSystemDeletable from '@odf/core/hooks/useIsSANSystemDeletable';
import { ClusterKind } from '@odf/core/types/scale';
import { LoadingInline } from '@odf/shared/generic/Loading';
import {
  CommonModalProps,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { ClusterModel } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  k8sDelete,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Alert, Button, FormGroup, TextInput } from '@patternfly/react-core';

type DeleteSANSystemModalProps = CommonModalProps<{
  resource: ClusterKind;
}>;

const DeleteSANSystemModal: React.FC<DeleteSANSystemModalProps> = ({
  isOpen,
  closeModal,
  extraProps: { resource },
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const isSANSystemDeletable = useIsSANSystemDeletable();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [confirmName, setConfirmName] = React.useState('');

  const displayName = SAN_STORAGE_SYSTEM_NAME;
  const isConfirmNameValid = confirmName === displayName;

  const submit = async (event: React.FormEvent | React.MouseEvent) => {
    event.preventDefault();
    setError('');

    if (!resource) {
      setError(t('SAN system is not available for deletion.'));
      return;
    }

    if (!isSANSystemDeletable) {
      setError(t('Cannot be deleted if LUN groups exist.'));
      return;
    }

    setLoading(true);
    try {
      await k8sDelete({
        resource,
        model: ClusterModel,
        requestInit: null,
        json: null,
      });

      const pathName = window.location.pathname;
      // Leave the SAN dashboard/details if we just deleted that system
      if (new RegExp(`/${displayName}(/|$)`).test(pathName)) {
        navigate('/odf/external-systems');
      }
      closeModal();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : (deleteError as { message?: string })?.message ||
              t('Failed to delete SAN system')
      );
      setLoading(false);
    }
  };

  return (
    <Modal
      variant={ModalVariant.small}
      header={
        <ModalHeader>
          <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
          {t('Delete SAN-based storage?')}
        </ModalHeader>
      }
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
    >
      <ModalBody>
        <FormGroup
          label={t('Type {{name}} to confirm', { name: displayName })}
          fieldId="confirm-san-name"
        >
          <TextInput
            id="confirm-san-name"
            aria-label={t('Confirm name')}
            value={confirmName}
            onChange={(_event, value) => setConfirmName(value)}
            data-test="confirm-name-input"
            className="pf-v6-u-mb-sm"
          />
        </FormGroup>
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('An error occurred')}
            className="pf-v6-u-mt-md"
          >
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        {!loading ? (
          <Button
            key="delete"
            variant="danger"
            onClick={submit}
            data-test="delete-action"
            isDisabled={
              !isSANSystemDeletable || !isConfirmNameValid || !resource
            }
          >
            {t('Delete')}
          </Button>
        ) : (
          <LoadingInline />
        )}
        <Button
          key="cancel"
          variant="secondary"
          onClick={closeModal}
          data-test="cancel-action"
        >
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteSANSystemModal;
