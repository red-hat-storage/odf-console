import * as React from 'react';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import { LoadingInline } from '@odf/shared/generic/Loading';
import {
  CommonModalProps,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@odf/shared/modals/Modal';
import { DeploymentModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { DeploymentKind, K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { resourcePathFromModel } from '@odf/shared/utils';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Alert, Button } from '@patternfly/react-core';
import { getAttachOBCPatch } from '../../utils';
import './attach-deployment.scss';

type AttachDeploymentToOBCModalProps = CommonModalProps<{
  resource: K8sResourceKind;
  namespace: string;
}>;

const AttachDeploymentToOBCModal: React.FC<AttachDeploymentToOBCModalProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const [requestDeployment, setRequestedDeployment] =
    React.useState<DeploymentKind>(null);
  const [inProgress, setProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const {
    closeModal,
    isOpen,
    extraProps: { resource, namespace },
  } = props;

  const navigate = useNavigate();

  // Deployments

  const deploymentResource = {
    kind: DeploymentModel.kind,
    namespaced: true,
    isList: true,
    namespace,
  };

  const obcName = getName(resource);

  const submit: React.FormEventHandler<EventTarget> = (e) => {
    setProgress(true);
    e.preventDefault();
    k8sPatch({
      model: DeploymentModel,
      resource: requestDeployment,
      data: getAttachOBCPatch(obcName, requestDeployment),
    })
      .then((res) => {
        navigate(
          `${resourcePathFromModel(
            DeploymentModel,
            res.metadata.name,
            res.metadata.namespace
          )}/environment`
        );
        closeModal();
      })
      .catch((err) => {
        setErrorMessage(err);
      })
      .finally(() => {
        setProgress(false);
      });
  };

  const Header = <ModalHeader>{t('Attach OBC to a Deployment')}</ModalHeader>;

  return (
    <Modal
      header={Header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper
      variant={ModalVariant.small}
    >
      <ModalBody>
        <div>
          <label
            htmlFor="dropdown-selectbox"
            className="control-label co-required"
          >
            {t('Deployment Name')}
          </label>
        </div>
        <ResourceDropdown<DeploymentKind>
          className="odf-deployment__dropdown"
          id="dropdown-selectbox"
          resource={deploymentResource}
          resourceModel={DeploymentModel}
          onSelect={(selectedResource) =>
            setRequestedDeployment(selectedResource)
          }
          data-test="dropdown-selectbox"
        />
        {errorMessage && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {(errorMessage as any)?.message}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="secondary" onClick={closeModal}>
          {t('Cancel')}
        </Button>
        {!inProgress ? (
          <Button
            key="Attach"
            variant="primary"
            onClick={submit}
            data-test="attach-action"
          >
            {t('Attach')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

export default AttachDeploymentToOBCModal;
