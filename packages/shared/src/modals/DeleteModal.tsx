import * as React from 'react';
import {
  k8sDelete,
  k8sList,
  K8sResourceCommon,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom-v5-compat';
import { Alert, Button, FormGroup, TextInput } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { LoadingInline } from '../generic/Loading';
import { ClusterServiceVersionModel } from '../models';
import { getName } from '../selectors';
import { ClusterServiceVersionKind } from '../types/console-types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { referenceForOwnerRef, findOwner } from '../utils';
import { ModalBody, ModalFooter, ModalHeader, CommonModalProps } from './Modal';

type DeleteModalExtraProps = {
  resource: K8sResourceCommon;
  resourceModel: K8sModel;
  cluster?: string;
  cleanupBeforeDelete?: (resource: K8sResourceCommon) => Promise<void>;
  confirmWithName?: string;
};

const DeleteModal: React.FC<CommonModalProps<DeleteModalExtraProps>> = ({
  closeModal,
  isOpen,
  extraProps: {
    resource,
    resourceModel,
    cluster,
    cleanupBeforeDelete,
    confirmWithName,
  },
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const [isChecked, setIsChecked] = React.useState(true);
  const [owner, setOwner] = React.useState(null);
  const [confirmName, setConfirmName] = React.useState('');

  const isConfirmNameValid = getName(resource) === confirmName;
  React.useEffect(() => {
    const namespace = resource?.metadata?.namespace;
    if (!namespace || !resource?.metadata?.ownerReferences?.length) {
      return;
    }
    k8sList<ClusterServiceVersionKind>({
      model: ClusterServiceVersionModel,
      queryParams: { ns: namespace },
      requestInit: null,
    })
      .then((data) => {
        const resourceOwner = findOwner(resource, data as any);
        setOwner(resourceOwner);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('Could not fetch CSVs', e);
      });
  });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    if (cleanupBeforeDelete) {
      try {
        await cleanupBeforeDelete(resource);
      } catch (cleanupError) {
        setError(cleanupError);
        setLoading(false);
        return;
      }
    }

    //https://kubernetes.io/docs/concepts/workloads/controllers/garbage-collection/
    const propagationPolicy =
      isChecked && resourceModel ? resourceModel.propagationPolicy : 'Orphan';
    const json = propagationPolicy
      ? { kind: 'DeleteOptions', apiVersion: 'v1', propagationPolicy }
      : null;

    k8sDelete({
      resource,
      model: resourceModel,
      json,
      requestInit: null,
      ...(!!cluster ? { cluster } : {}),
    })
      .then(() => {
        // If we are currently on the deleted resource's page, redirect to the resource list page
        const re = new RegExp(`/${resource.metadata.name}(/|$)`);
        const pathName = window.location.pathname;
        if (re.test(pathName)) {
          navigate(pathName.replace(re, ''));
        }
        closeModal();
      })
      .catch((deleteError) => {
        setError(deleteError);
        setLoading(false);
      });
  };

  const header = (
    <ModalHeader>
      <ExclamationTriangleIcon color="#f0ab00" className="icon--spacer" />
      {t('Delete {{kind}}?', {
        kind: resourceModel
          ? resourceModel.labelKey
            ? t(resourceModel.labelKey)
            : resourceModel.label
          : '',
      })}
    </ModalHeader>
  );

  const isNamespaced: boolean = !!resource?.metadata?.namespace;
  const isPropagative = !!resourceModel.propagationPolicy;

  return (
    <Modal
      variant={ModalVariant.small}
      header={header}
      isOpen={isOpen}
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
    >
      <ModalBody>
        {isNamespaced ? (
          <Trans t={t}>
            Are you sure you want to delete{' '}
            <strong className="co-break-word">
              {{ resourceName: resource.metadata.name }}
            </strong>{' '}
            in namespace{' '}
            <strong>{{ namespace: resource.metadata.namespace }}</strong>?
          </Trans>
        ) : (
          <Trans t={t}>
            Are you sure you want to delete{' '}
            <strong className="co-break-word">
              {{ resourceName: resource.metadata.name }}
            </strong>
            ?
          </Trans>
        )}
        {isPropagative && (
          <div className="checkbox">
            <label className="control-label">
              <input
                type="checkbox"
                onChange={() => setIsChecked(!isChecked)}
                checked={!!isChecked}
              />
              {t('Delete dependent objects of this resource')}
            </label>
          </div>
        )}
        {confirmWithName && (
          <FormGroup
            label={t('Type {{name}} to confirm', { name: getName(resource) })}
            fieldId="confirm-name"
          >
            <TextInput
              id="confirm-name"
              aria-label={t('Confirm name')}
              value={confirmName}
              onChange={(_event, value) => setConfirmName(value)}
            />
          </FormGroup>
        )}
        {owner && (
          <Alert
            className="co-alert co-alert--margin-top"
            isInline
            variant="warning"
            title={t('Managed resource')}
          >
            <Trans t={t}>
              This resource is managed by{' '}
              <ResourceLink
                className="modal__inline-resource-link"
                inline
                kind={referenceForOwnerRef(owner)}
                name={owner.name}
                namespace={resource.metadata.namespace}
                onClick={closeModal}
              />
              and any modifications may be overwritten. Edit the managing
              resource to preserve changes.
            </Trans>
          </Alert>
        )}
        {error && (
          <Alert isInline variant="danger" title={t('An error occurred')}>
            {(error as any)?.message}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant="secondary"
          onClick={closeModal}
          data-test="cancel-action"
        >
          {t('Cancel')}
        </Button>
        {!loading ? (
          <Button
            key="delete"
            variant="danger"
            onClick={submit}
            data-test="delete-action"
            isDisabled={confirmWithName ? !isConfirmNameValid : false}
          >
            {t('Delete')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

export default DeleteModal;
