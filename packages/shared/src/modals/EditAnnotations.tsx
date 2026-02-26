import * as React from 'react';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Button, Title, TitleSizes } from '@patternfly/react-core';
import FormAlertInline from '../generic/FormAlertInline';
import { LoadingInline } from '../generic/Loading';
import { getAnnotations } from '../selectors';
import { K8sResourceKind } from '../types';
import { useCustomTranslation } from '../useCustomTranslationHook';
import {
  LazyNameValueEditor,
  NameValueEditorPair,
} from '../utils/NameValueEditor';
import { CommonModalProps, ModalBody, ModalFooter } from './Modal';

type AnnotationsModalProps = {
  titleKey: string;
  errorMessage: string;
  extraProps: {
    resource: K8sResourceKind;
    resourceModel: K8sKind;
    cluster?: string;
  };
} & CommonModalProps;

const ANNOTATIONS_PATH = '/metadata/annotations';

export const AnnotationsModal: React.FC<AnnotationsModalProps> = ({
  extraProps: { resource, resourceModel, cluster },
  closeModal,
  isOpen,
}) => {
  const [inProgress, setProgress] = React.useState(false);
  const [tags, setTags] = React.useState(() =>
    _.isEmpty(getAnnotations(resource))
      ? [['', '']]
      : _.toPairs(getAnnotations(resource))
  );
  const [errorMessage, setErrorMessage] = React.useState(null);

  const { t } = useCustomTranslation();

  const onSubmit = (e?: any) => {
    setProgress(true);
    if (e) {
      e.preventDefault();
    }
    // We just throw away any rows where the key is blank
    const usedTags = _.reject(tags, (tag) =>
      _.isEmpty(tag[NameValueEditorPair.Name])
    );

    const keys = usedTags.map((tag) => tag[NameValueEditorPair.Name]);
    if (_.uniq(keys).length !== keys.length) {
      setErrorMessage(t('Duplicate keys found.'));
      return;
    }
    const patch = [
      {
        path: ANNOTATIONS_PATH,
        op: _.isEmpty(getAnnotations(resource)) ? 'add' : 'replace',
        value: _.fromPairs(usedTags),
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
        setErrorMessage(err.message);
      })
      .finally(() => {
        setProgress(false);
      });
  };

  const header = (
    <Title headingLevel="h1" size={TitleSizes['2xl']}>
      {t('Edit annotations')}
    </Title>
  );
  return (
    <Modal
      isOpen={isOpen}
      header={header}
      variant={ModalVariant.small}
      showClose={false}
    >
      <ModalBody className="modalBody">
        <LazyNameValueEditor
          nameValuePairs={tags}
          submit={onSubmit}
          updateParentData={({ nameValuePairs }) => {
            setTags(nameValuePairs);
          }}
        />
        <FormAlertInline
          title={t('An error occurred')}
          message={errorMessage}
        />
      </ModalBody>
      <ModalFooter>
        <Button
          key="cancel"
          variant="secondary"
          onClick={closeModal}
          isDisabled={inProgress}
        >
          {t('Cancel')}
        </Button>
        {!inProgress ? (
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

export default AnnotationsModal;
