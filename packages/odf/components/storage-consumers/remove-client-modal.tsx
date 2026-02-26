import * as React from 'react';
import {
  getName,
  ModalBody,
  ModalFooter,
  ModalTitle,
  StorageConsumerKind,
  useCustomTranslation,
  StorageConsumerModel,
  getAnnotations,
} from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import {
  k8sDelete,
  k8sPatch,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import * as _ from 'lodash-es';
import { Trans } from 'react-i18next';
import {
  Button,
  Checkbox,
  Flex,
  FlexItem,
  FormGroup,
} from '@patternfly/react-core';

type RemoveClientModalProps = CommonModalProps<{
  resource: StorageConsumerKind;
}>;

const ANNOTATIONS_PATH = '/metadata/annotations';
const FORCE_DELETION_ANNOTATION = 'ocs.openshift.io/force-deletion';

const RemoveClientModal: React.FC<RemoveClientModalProps> = (props) => {
  const {
    extraProps: { resource },
    isOpen,
    closeModal,
  } = props;
  const { t } = useCustomTranslation();
  const [confirmed, setConfirmed] = React.useState(false);
  const [inProgress, setProgress] = React.useState(false);
  const [forceDeletion, setForceDeletion] = React.useState(false);
  const [error, setError] = React.useState<Error>(null);
  const MODAL_TITLE = t('Permanently delete StorageConsumer?');
  const onSubmit = async (event) => {
    event.preventDefault();
    setProgress(true);
    if (forceDeletion) {
      const annotations = getAnnotations(resource);
      const areAnnotationsPresent = !_.isEmpty(annotations);
      const guardedAnnotations = _.isEmpty(annotations) ? {} : annotations;
      const updatedAnnotations = {
        ...guardedAnnotations,
        [FORCE_DELETION_ANNOTATION]: '',
      };
      try {
        await k8sPatch({
          model: StorageConsumerModel,
          resource,
          data: [
            {
              op: areAnnotationsPresent ? 'replace' : 'add',
              path: ANNOTATIONS_PATH,
              value: updatedAnnotations,
            },
          ],
        });
      } catch (err) {
        setError(err);
        setProgress(false);
        return;
      }
    }
    k8sDelete({ model: StorageConsumerModel, resource })
      .then(() => {
        setProgress(false);
        closeModal();
      })
      .catch((err) => {
        setProgress(false);
        setError(err);
      });
  };

  const onKeyUp = (e) => {
    setConfirmed(e.currentTarget.value === getName(resource));
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} variant={ModalVariant.small}>
      <ModalTitle>
        <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
        {MODAL_TITLE}
      </ModalTitle>
      <ModalBody>
        <p>
          <Trans t={t}>
            This will remove the StorageConsumer from the environment. This
            action cannot be undone.
          </Trans>
        </p>
        <p>
          <FormGroup>
            <Checkbox
              id="force-deletion-checkbox"
              label={t('Force deletion')}
              isChecked={forceDeletion}
              onChange={(_event, checked) => setForceDeletion(checked)}
              data-test="force-deletion-checkbox"
              description={t(
                'Erases all associated data and Ceph/Rook resources. Recommended only if the storage used by this StorageConsumer is no longer needed.'
              )}
            />
          </FormGroup>
        </p>
        <p>
          <Trans t={t}>
            Confirm deletion by typing{' '}
            <strong className="co-break-word">
              {{ name: getName(resource) }}
            </strong>{' '}
            below:
          </Trans>
        </p>
        <input
          type="text"
          data-test="project-name-input"
          className="pf-v6-c-form-control"
          onKeyUp={onKeyUp}
          placeholder={t('Enter name')}
          aria-label={t('Type client name to confirm {{label}}', {
            label: StorageConsumerModel.labelKey,
          })}
        />
      </ModalBody>
      <ModalFooter inProgress={inProgress} errorMessage={error?.message}>
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Button
              type="submit"
              variant="danger"
              isDisabled={!confirmed}
              data-test="confirm-action"
              id="confirm-action"
              onClick={onSubmit}
            >
              {t('Delete')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              type="button"
              variant="secondary"
              data-test-id="modal-cancel-action"
              onClick={() => closeModal()}
              aria-label={t('Cancel')}
            >
              {t('Cancel')}
            </Button>
          </FlexItem>
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default RemoveClientModal;
