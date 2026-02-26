import * as React from 'react';
import {
  k8sPatch,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import {
  Button,
  Title,
  TitleSizes,
  AlertVariant,
} from '@patternfly/react-core';
import FormAlertInline from '../generic/FormAlertInline';
import { LoadingInline } from '../generic/Loading';
import { ResourceIcon } from '../resource-link/resource-link';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { CommonModalProps } from './common';
import { ModalBody, ModalFooter } from './Modal';
import { TranslatedSelectorInput } from './Selector';

type Patch = {
  op: string;
  path: string;
  value?: any;
};

const LABELS_PATH = '/metadata/labels';

type EditLabelModalExtraProps = {
  resource: K8sResourceCommon;
  resourceModel: K8sModel;
  cluster?: string;
};

type EditLabelModalProps = {
  labelClassName?: string;
} & CommonModalProps<EditLabelModalExtraProps>;

export const arrayify = (obj) => _.map(obj, (v, k) => (v ? `${k}=${v}` : k));
export const objectify = (arr) => {
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
  extraProps: { resource, resourceModel, cluster },
}) => {
  const [labels, setLabels] = React.useState(
    arrayify(_.get(resource, LABELS_PATH.split('/').slice(1)))
  );
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState();
  const [errorTitle, setErrorTitle] = React.useState();
  const [errorVariant, setErrorVariant] = React.useState<AlertVariant>();

  const createPath = !labels.length;
  const { t } = useCustomTranslation();

  const onSubmit = () => {
    setLoading(true);
    const patch: Patch[] = [
      {
        op: createPath ? 'add' : 'replace',
        path: LABELS_PATH,
        value: objectify(labels),
      },
    ];

    k8sPatch({
      model: resourceModel,
      resource,
      data: patch,
      ...(!!cluster ? { cluster } : {}),
    })
      .then(() => {
        closeModal();
      })
      .catch((err) => {
        setErrorTitle(t('An error occurred'));
        setErrorMessage(err.message);
        setErrorVariant(AlertVariant.danger);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const descriptionKey = resourceModel.labelKey;

  const header = (
    <Title headingLevel="h1" size={TitleSizes['2xl']}>
      {descriptionKey
        ? t('Edit {{description}}', { description: descriptionKey })
        : t('Edit labels')}
    </Title>
  );

  const handleSelectorInputErrorMessage = (isValid: boolean) => {
    if (isValid) {
      setErrorTitle(undefined);
      setErrorMessage(undefined);
      setErrorVariant(undefined);
    } else {
      setErrorTitle(t('Invalid label name'));
      // https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#syntax-and-character-set
      setErrorMessage(
        t(
          'Labels must start and end with an alphanumeric character, can consist of lower-case letters, numbers, dots (.), hyphens (-), forward slash (/), underscore(_) and equal to (=)'
        )
      );
      setErrorVariant(AlertVariant.warning);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      header={header}
      variant={ModalVariant.small}
      showClose={false}
    >
      <ModalBody className="modalBody modalInput--defaultHeight">
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
                ? t('{{description}} for', { description: descriptionKey })
                : t('Labels for')}{' '}
              <ResourceIcon resourceModel={resourceModel} />{' '}
              {resource.metadata.name}
            </label>
            <TranslatedSelectorInput
              onChange={(l) => setLabels(l)}
              tags={labels}
              labelClassName={labelClassName || `co-text-${resourceModel.id}`}
              autoFocus
              setErrorMessage={handleSelectorInputErrorMessage}
            />
          </div>
        </div>
        <FormAlertInline
          title={errorTitle}
          message={errorMessage}
          variant={errorVariant}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant="secondary"
          onClick={closeModal}
          isDisabled={loading}
        >
          {t('Cancel')}
        </Button>
        {!loading ? (
          <Button
            key="Save"
            variant="primary"
            onClick={onSubmit}
            isDisabled={errorVariant === AlertVariant.warning}
          >
            {t('Save')}
          </Button>
        ) : (
          <LoadingInline />
        )}
      </ModalFooter>
    </Modal>
  );
};

export default EditLabelModal;
