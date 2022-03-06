import * as React from 'react';
import {
  k8sPatch,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { ResourceIcon } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt';
import { Patch } from '@openshift-console/dynamic-plugin-sdk-internal-kubevirt/lib/extensions';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Modal,
  ModalVariant,
  Title,
  TitleSizes,
} from '@patternfly/react-core';
import { LoadingInline } from '../generic/Loading';
import { referenceForModel } from '../utils';
import { CommonModalProps } from './common';
import { ModalBody, ModalFooter } from './Modal';
import { SelectorInput } from './Selector';

const LABELS_PATH = '/metadata/labels';

const ErrorMessage = ({ message }) => {
  const { t } = useTranslation('plugin__odf-console');
  return (
    <Alert
      isInline
      className="co-alert co-alert--scrollable"
      variant="danger"
      title={t('An error occurred')}
    >
      <div className="co-pre-line">{message}</div>
    </Alert>
  );
};

type EditLabelModalExtraProps = {
  resource: K8sResourceCommon;
  resourceModel: K8sModel;
};

type EditLabelModalProps = {
  labelClassName?: string;
} & CommonModalProps<EditLabelModalExtraProps>;

const arrayify = (obj) => _.map(obj, (v, k) => (v ? `${k}=${v}` : k));
const objectify = (arr) => {
  const result = {};
  _.each(arr, (item) => {
    const [key, value = null] = item.split('=');
    result[key] = value;
  });
  return result;
};

export const EditLabelModal: React.FC<EditLabelModalProps> = ({
  closeModal,
  labelClassName,
  isOpen,
  extraProps: { resource, resourceModel },
}) => {
  const [labels, setLabels] = React.useState(
    arrayify(_.get(resource, LABELS_PATH.split('/').slice(1)))
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState();

  const createPath = !labels.length;
  const { t } = useTranslation('plugin__odf-console');

  const onSubmit = () => {
    const patch: Patch[] = [
      {
        op: createPath ? 'add' : 'replace',
        path: LABELS_PATH,
        value: objectify(labels),
      },
    ];

    k8sPatch({ model: resourceModel, resource, data: patch })
      .then(() => {
        closeModal();
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const descriptionKey = resourceModel.labelKey;

  const header = (
    <Title headingLevel="h1" size={TitleSizes['2xl']}>
      {descriptionKey
        ? t('Edit {{description}}', { description: t(descriptionKey) })
        : t('Edit labels')}
    </Title>
  );
  return (
    <Modal isOpen={isOpen} header={header} variant={ModalVariant.small}>
      <ModalBody className="modalBody">
        <div className="row co-m-form-row">
          <div className="col-sm-12">
            {t(
              'Labels help you organize and select resources. Adding labels below will let you query for objects that have similar, overlapping or dissimilar labels.'
            )}
          </div>
        </div>
        <div className="row co-m-form-row">
          <div className="col-sm-12">
            <label htmlFor="tags-input" className="control-label">
              {descriptionKey
                ? t('{{description}} for', { description: t(descriptionKey) })
                : t('public~Labels for')}{' '}
              <ResourceIcon
                kind={
                  resourceModel.crd
                    ? referenceForModel(resourceModel)
                    : resourceModel.kind
                }
              />{' '}
              {resource.metadata.name}
            </label>
            <SelectorInput
              onChange={(l) => setLabels(l)}
              tags={labels}
              labelClassName={labelClassName || `co-text-${resourceModel.id}`}
              autoFocus
            />
          </div>
        </div>
        <div>{errorMessage && <ErrorMessage message={errorMessage} />}</div>
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="secondary" onClick={closeModal}>
          {t('Cancel')}
        </Button>
        {!loading ? (
          <Button key="Save" variant="primary" onClick={onSubmit}>
            {t('Save')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};
