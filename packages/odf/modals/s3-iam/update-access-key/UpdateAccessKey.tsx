import * as React from 'react';
import { StatusType } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import useSWRMutation from 'swr/mutation';
import {
  Button,
  ButtonVariant,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';
import { AccessKeyStatus } from '../../../constants/s3-iam';

export type UpdateAccessKeyModalProps = {
  name: string;
  AccessKeyId: string;
  status: StatusType;
  iamClient: IamCommands;
};

const UpdateAccessKey: React.FC<
  CommonModalProps<UpdateAccessKeyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { name, AccessKeyId, status, iamClient: _iamClient },
}) => {
  const { t } = useCustomTranslation();
  const iamClient = _iamClient;

  const {
    trigger: updateAccessKey,
    isMutating: inProgress,
    error,
  } = useSWRMutation(`update-access-key-${name}-${AccessKeyId}`, async () => {
    await iamClient.updateAccessKey({
      UserName: name,
      AccessKeyId: AccessKeyId,
      Status: status,
    });
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await updateAccessKey();
      // Only close modal if mutation succeeded (no error thrown)
      closeModal();
    } catch (_err) {
      // Error is already caught by useSWRMutation and surfaced via ButtonBar
      // Just prevent uncaught promise rejection - don't close modal on error
    }
  };

  let descriptionText: string,
    title: string,
    buttonType: ButtonVariant,
    buttonText: string;

  if (status === AccessKeyStatus.ACTIVE) {
    title = t('Activate access key');
    descriptionText = t(
      'Activated users can access policies and permissions. You can now assign or update access control for this user.'
    );
    buttonType = ButtonVariant.primary;
    buttonText = t('Activate');
  } else {
    title = t('Deactivate access key');
    descriptionText = t(
      'Deactivated users cannot access policies or permissions. You will need to reactivate the user to restore access control.'
    );
    buttonType = ButtonVariant.danger;
    buttonText = t('Deactivate');
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={inProgress ? undefined : closeModal}
      title={title}
      description={<div className="text-muted">{descriptionText}</div>}
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={error ? error?.message || JSON.stringify(error) : ''}
        >
          <span>
            <Button
              variant={buttonType}
              onClick={handleSubmit}
              isLoading={inProgress}
              isDisabled={!!error || inProgress}
              className="pf-v5-u-mr-xs"
            >
              {buttonText}
            </Button>
            <Button
              variant={ButtonVariant.plain}
              onClick={closeModal}
              isDisabled={inProgress}
              className="pf-v5-u-ml-xs"
            >
              {t('Cancel')}
            </Button>
          </span>
        </ButtonBar>,
      ]}
    >
      <Form>
        <FormGroup label={t('Access key')}>
          <div className="text-muted">{AccessKeyId}</div>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default UpdateAccessKey;
