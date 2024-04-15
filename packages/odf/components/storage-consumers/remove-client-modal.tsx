import * as React from 'react';
import {
  getName,
  ModalBody,
  ModalFooter,
  ModalTitle,
  StorageConsumerKind,
  useCustomTranslation,
} from '@odf/shared';
import {
  k8sDelete,
  YellowExclamationTriangleIcon,
} from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Trans } from 'react-i18next';
import {
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { StorageConsumerModel } from '../../models';

type RemoveClientModalProps = ModalComponent<{
  isOpen: boolean;
  resource: StorageConsumerKind;
}>;

export const RemoveClientModal: RemoveClientModalProps = ({
  resource,
  closeModal,
  isOpen,
}) => {
  const { t } = useCustomTranslation();
  const [confirmed, setConfirmed] = React.useState(false);
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>(null);
  const MODAL_TITLE = t('Permanently delete storage client?');

  const onSubmit = (event) => {
    event.preventDefault();
    setProgress(true);
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
            Deleting the storage client {getName(resource)} will remove all
            Ceph/Rook resources and erase all data associated with this client,
            leading to permanent deletion of the client. This action cannot be
            undone. It will destroy all pods, services and other objects in the
            namespace{' '}
            <strong className="co-break-word">
              {{ name: getName(resource) }}
            </strong>
            .
          </Trans>
        </p>
        <p>
          Recommended only if the storage used by this client is no longer
          needed, as all stored data will be erased.
        </p>
        <p>
          <Trans t={t}>
            Confirm deletion by typing&nbsp;
            <strong className="co-break-word">
              {{ name: getName(resource) }}
            </strong>{' '}
            below:
          </Trans>
        </p>
        <input
          type="text"
          data-test="project-name-input"
          className="pf-v5-c-form-control"
          onKeyUp={onKeyUp}
          placeholder={t('Enter name')}
          aria-label={t('Type client name to confirm', {
            label: t(StorageConsumerModel.labelKey),
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
