import * as React from 'react';
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
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  TextInput,
  TextInputTypes,
  ValidatedOptions,
} from '@patternfly/react-core';
import { getValueValidations } from '../../../utils/s3-iam';

export type EditDescriptionTagModalProps = {
  name: string;
  AccessKeyId: string;
  iamClient: IamCommands;
};

const EditDescriptionTag: React.FC<
  CommonModalProps<EditDescriptionTagModalProps>
> = ({
  closeModal,
  isOpen,
  extraProps: { name, AccessKeyId, iamClient: _iamClient },
}) => {
  const { t } = useCustomTranslation();
  const [descriptionTagValue, setDescriptionTagValue] =
    React.useState<string>('');
  const iamClient = _iamClient;

  const {
    trigger: tagUser,
    isMutating: inProgress,
    error: apiError,
  } = useSWRMutation(`tag-user-${name}-${AccessKeyId}`, async () => {
    await iamClient.tagUser({
      UserName: name,
      Tags: [
        {
          Key: AccessKeyId,
          Value: descriptionTagValue,
        },
      ],
    });
  });

  const [validationVariant, helperText] = getValueValidations(
    descriptionTagValue,
    t
  );

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();

    // Prevent submission if validation fails (button is already disabled, but double-check)
    if (validationVariant === ValidatedOptions.error) {
      return;
    }

    try {
      await tagUser();
      // Only close modal if mutation succeeded (no error thrown)
      closeModal();
    } catch (_err) {
      // Error is already caught by useSWRMutation and surfaced via ButtonBar
      // Just prevent uncaught promise rejection - don't close modal on error
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={inProgress ? undefined : closeModal}
      title={t('Edit Description tag')}
      description={
        <div className="text-muted">
          {t(
            'Description tag will be attached to the access key for this user'
          )}
        </div>
      }
      actions={[
        <ButtonBar
          inProgress={inProgress}
          errorMessage={
            apiError ? apiError?.message || JSON.stringify(apiError) : ''
          }
        >
          <span>
            <Button
              variant={ButtonVariant.primary}
              onClick={handleSubmit}
              isLoading={inProgress}
              isDisabled={
                validationVariant === ValidatedOptions.error || inProgress
              }
              className="pf-v5-u-mr-xs"
            >
              {t('Update')}
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
        <FormGroup label={t('Description tag')}>
          <TextInput
            type={TextInputTypes.text}
            placeholder={t('Input field')}
            value={descriptionTagValue}
            className="pf-v5-u-w-50"
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

export default EditDescriptionTag;
