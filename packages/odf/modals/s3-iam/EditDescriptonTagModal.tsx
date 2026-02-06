import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { CommonModalProps } from '@odf/shared/modals';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  TextInputTypes,
  ValidatedOptions,
} from '@patternfly/react-core';
import { getValueValidations } from '../../utils/s3-iam';

export type EditDescriptionTagModalProps = {
  name: string;
  AccessKeyId: string;
  iamClient: IamCommands;
  refreshTokens: () => void;
};

const EditDescriptionTagModal: React.FC<
  CommonModalProps<EditDescriptionTagModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { name, AccessKeyId, iamClient, refreshTokens },
}) => {
  const { t } = useCustomTranslation();
  const [descriptionTagValue, setDescriptionTagValue] =
    React.useState<string>('');
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [error, setError] = React.useState<Error>();

  const [validationVariant, helperText] = getValueValidations(
    descriptionTagValue,
    t
  );

  const handleClose = () => {
    if (!inProgress) {
      closeModal();
    }
  };

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();

    // Prevent submission if validation fails
    if (validationVariant === ValidatedOptions.error) {
      return;
    }

    setInProgress(true);
    setError(undefined);

    try {
      await iamClient.tagUser({
        UserName: name,
        Tags: [
          {
            Key: AccessKeyId,
            Value: descriptionTagValue,
          },
        ],
      });
      setInProgress(false);
      closeModal();
      refreshTokens?.();
    } catch (err) {
      setInProgress(false);
      setError(err as Error);
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={handleClose}
      title={t('Edit description tag')}
      description={
        <div className="text-muted">
          {t(
            'Description tag will be attached to the access key for this user'
          )}
        </div>
      }
      actions={[
        <ButtonBar
          className="pf-v6-u-w-100"
          inProgress={inProgress}
          errorMessage={error ? error?.message || JSON.stringify(error) : ''}
        >
          <Flex>
            <FlexItem>
              <Button
                variant={ButtonVariant.primary}
                onClick={handleSubmit}
                isLoading={inProgress}
                isDisabled={
                  validationVariant === ValidatedOptions.error || inProgress
                }
              >
                {t('Update')}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                icon={t('Cancel')}
                variant={ButtonVariant.plain}
                onClick={closeModal}
                isDisabled={inProgress}
              />
            </FlexItem>
          </Flex>
        </ButtonBar>,
      ]}
    >
      <Form>
        <FormGroup label={t('Description tag')}>
          <TextInput
            type={TextInputTypes.text}
            placeholder={t('Input field')}
            value={descriptionTagValue}
            className="pf-v6-u-w-50"
            validated={validationVariant}
            onChange={(_event, value) => {
              setDescriptionTagValue(value);
            }}
          />

          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={validationVariant}>
                {helperText}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default EditDescriptionTagModal;
