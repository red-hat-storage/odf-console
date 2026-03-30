import * as React from 'react';
import { AccessKeyStatus } from '@odf/core/constants/s3-iam';
import { useCustomTranslation } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Modal,
  ModalVariant,
} from '@patternfly/react-core';

export type UpdateAccessKeyModalProps = {
  name: string;
  AccessKeyId: string;
  updateStatusTo: AccessKeyStatus;
  iamClient: IamCommands;
  refreshTokens: () => void;
};

const UpdateAccessKeyModal: React.FC<
  CommonModalProps<UpdateAccessKeyModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { name, AccessKeyId, updateStatusTo, iamClient, refreshTokens },
}) => {
  const { t } = useCustomTranslation();
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const handleClose = () => {
    if (!inProgress) {
      closeModal();
    }
  };

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    setInProgress(true);
    setError(undefined);

    try {
      await iamClient.updateAccessKey({
        UserName: name,
        AccessKeyId,
        Status: updateStatusTo,
      });
      setInProgress(false);
      closeModal();
      refreshTokens?.();
    } catch (err) {
      setInProgress(false);
      setError(err as Error);
    }
  };

  const { title, descriptionText, buttonType, buttonText } =
    React.useMemo(() => {
      const isActivating = updateStatusTo === AccessKeyStatus.ACTIVE;
      return {
        title: t(
          isActivating ? 'Activate access key' : 'Deactivate access key'
        ),
        descriptionText: t(
          isActivating
            ? 'Activated users can access policies and permissions. You can now assign or update access control for this user.'
            : 'Deactivated users cannot access policies or permissions. You will need to reactivate the user to restore access control.'
        ),
        buttonType: isActivating ? ButtonVariant.primary : ButtonVariant.danger,
        buttonText: t(isActivating ? 'Activate' : 'Deactivate'),
      };
    }, [updateStatusTo, t]);

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={<div className="text-muted">{descriptionText}</div>}
      actions={[
        <ButtonBar
          className="pf-v5-u-w-100"
          inProgress={inProgress}
          errorMessage={error ? error?.message || JSON.stringify(error) : ''}
        >
          <Flex>
            <FlexItem>
              <Button
                variant={buttonType}
                onClick={handleSubmit}
                isLoading={inProgress}
                isDisabled={inProgress}
              >
                {buttonText}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                variant={ButtonVariant.plain}
                onClick={closeModal}
                isDisabled={inProgress}
              >
                {t('Cancel')}
              </Button>
            </FlexItem>
          </Flex>
        </ButtonBar>,
      ]}
    >
      <Flex direction={{ default: 'column' }}>
        <FlexItem>
          <label className="pf-v5-u-font-weight-bold">{t('Access key')}</label>
        </FlexItem>
        <FlexItem>
          <div className="text-muted">{AccessKeyId}</div>
        </FlexItem>
      </Flex>
    </Modal>
  );
};

export default UpdateAccessKeyModal;
