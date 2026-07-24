import * as React from 'react';
import {
  IBM_SCALE_LOCAL_CLUSTER_NAME,
  IBM_SCALE_NAMESPACE,
} from '@odf/core/constants';
import useIsRemoteClusterDeletable from '@odf/core/hooks/useIsRemoteClusterDeletable';
import { ClusterKind, RemoteClusterKind } from '@odf/core/types/scale';
import { getName } from '@odf/shared';
import { ModalFooter } from '@odf/shared/generic/ModalTitle';
import {
  CommonModalProps,
  ModalBody,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { ClusterModel, RemoteClusterModel } from '@odf/shared/models/scale';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { k8sDelete, k8sList } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Alert,
  Button,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';

type RemoveRemoteClusterModalProps = CommonModalProps<{
  resource: RemoteClusterKind;
}>;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message
    : (error as { message?: string })?.message || String(error);

const RemoveRemoteClusterModal: React.FC<RemoveRemoteClusterModalProps> = ({
  isOpen,
  closeModal,
  extraProps: { resource },
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const clusterName = getName(resource);
  const isRemoteClusterDeletable = useIsRemoteClusterDeletable(clusterName);

  const [inProgress, setInProgress] = React.useState(false);
  const [error, setError] = React.useState<string>('');
  const [confirmName, setConfirmName] = React.useState('');

  const isConfirmNameValid = clusterName === confirmName;

  const handleRemove = async () => {
    setInProgress(true);
    setError('');
    let failureMessage = t('Failed to remove remote cluster');

    try {
      await k8sDelete({
        model: RemoteClusterModel,
        resource,
        requestInit: null,
        json: null,
      });

      failureMessage = t('Failed to list remote clusters');
      const remoteClusters = (await k8sList({
        model: RemoteClusterModel,
        queryParams: { ns: IBM_SCALE_NAMESPACE },
      })) as RemoteClusterKind[];
      const hasRemainingRemoteClusters = remoteClusters.some(
        (remoteCluster) => getName(remoteCluster) !== clusterName
      );

      if (!hasRemainingRemoteClusters) {
        failureMessage = t('Failed to list local Scale clusters');
        const localClusters = (await k8sList({
          model: ClusterModel,
          queryParams: { ns: IBM_SCALE_NAMESPACE },
        })) as ClusterKind[];
        const localCluster = localClusters.find(
          (cluster) => getName(cluster) === IBM_SCALE_LOCAL_CLUSTER_NAME
        );

        if (localCluster) {
          failureMessage = t('Failed to delete the local Scale cluster');
          await k8sDelete({
            model: ClusterModel,
            resource: localCluster,
            requestInit: null,
            json: null,
          });
        }
      }

      closeModal();
      navigate('/odf/external-systems');
    } catch (removeError) {
      setError(`${failureMessage}: ${getErrorMessage(removeError)}`);
      setInProgress(false);
    }
  };

  const title = t('Remove {{clusterName}}?', { clusterName });
  const modalTitle = <ModalHeader>{title}</ModalHeader>;

  return (
    <Modal
      isOpen={isOpen}
      header={modalTitle}
      aria-label={title}
      variant={ModalVariant.small}
      onClose={closeModal}
    >
      <ModalBody>
        <p data-test="remove-warning-text">
          {t(
            'Removing {{clusterName}} means you will no longer be able to access the remote file systems',
            { clusterName }
          )}
        </p>
        <FormGroup
          label={t('Type {{name}} to confirm', { name: clusterName })}
          fieldId="confirm-name"
          className="pf-v6-u-mt-md"
        >
          <TextInput
            id="confirm-name"
            aria-label={t('Confirm name')}
            value={confirmName}
            onChange={(_event, value) => setConfirmName(value)}
            data-test="confirm-name-input"
          />
        </FormGroup>
        {error && (
          <Alert
            isInline
            variant="danger"
            title={t('An error occurred')}
            className="pf-v6-u-mt-md"
            data-test="remove-error-alert"
          >
            {error}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter inProgress={inProgress}>
        <ActionGroup>
          <Button
            key="remove"
            variant="danger"
            onClick={handleRemove}
            isDisabled={
              inProgress || !isConfirmNameValid || !isRemoteClusterDeletable
            }
            isLoading={inProgress}
            data-test="remove-action"
          >
            {t('Remove')}
          </Button>
          <Button
            key="cancel"
            variant="link"
            onClick={closeModal}
            data-test="cancel-action"
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ModalFooter>
    </Modal>
  );
};

export default RemoveRemoteClusterModal;
