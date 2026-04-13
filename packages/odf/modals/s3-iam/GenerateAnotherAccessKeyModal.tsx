import * as React from 'react';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { IamCommands } from '@odf/shared/iam';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  Button,
  ButtonVariant,
  FormGroup,
  TextInput,
  Content,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
  ActionGroup,
} from '@patternfly/react-core';
import { AccessKeySecretKeyDisplayModal } from './AccessKeySecretKeyDisplayModal';

type GenerateAnotherAccessKeyModalProps = ModalComponent<{
  isOpen: boolean;
  userName?: string;
  refreshTokens?: () => void;
  iamClient?: IamCommands;
}>;

const MAX_DESCRIPTION_LENGTH = 256;

const validateDescription = (description: string): ValidatedOptions => {
  if (!description) {
    return ValidatedOptions.default;
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return ValidatedOptions.error;
  }
  return ValidatedOptions.default;
};

export const GenerateAnotherAccessKeyModal: GenerateAnotherAccessKeyModalProps =
  ({ isOpen, closeModal, userName, refreshTokens, iamClient }) => {
    const { t } = useCustomTranslation();
    const MODAL_TITLE = t('Generate another access key');
    const [description, setDescription] = React.useState('');
    const [inProgress, setInProgress] = React.useState(false);
    const [error, setError] = React.useState<Error>();
    const descriptionValidationState = React.useMemo(
      () => validateDescription(description),
      [description]
    );
    const launchModal = useModal();

    const onGenerate = React.useCallback(async () => {
      if (descriptionValidationState === ValidatedOptions.error) {
        return;
      }
      setInProgress(true);
      try {
        const response = await iamClient.createAccessKey({
          UserName: userName,
        });

        // Save description as user tag (Key = AccessKeyId, Value = description)
        if (response.AccessKey && description.trim()) {
          await iamClient.tagUser({
            UserName: userName,
            Tags: [
              {
                Key: response.AccessKey.AccessKeyId,
                Value: description.trim(),
              },
            ],
          });
        }

        closeModal();
        if (response.AccessKey) {
          launchModal(AccessKeySecretKeyDisplayModal, {
            isOpen: true,
            extraProps: {
              AccessKeyId: response.AccessKey.AccessKeyId,
              SecretKey: response.AccessKey.SecretAccessKey,
              title: t('Access key generated'),
              buttonText: t('Done'),
            },
          });
        }
        setInProgress(false);
        refreshTokens?.();
      } catch (err) {
        setInProgress(false);
        setError(err);
      }
    }, [
      closeModal,
      description,
      descriptionValidationState,
      iamClient,
      launchModal,
      refreshTokens,
      t,
      userName,
    ]);

    return (
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        variant={ModalVariant.medium}
        title={MODAL_TITLE}
        actions={[
          <ButtonBar
            key="actions"
            inProgress={inProgress}
            errorMessage={error?.message}
          >
            <ActionGroup>
              <Button
                variant={ButtonVariant.primary}
                onClick={onGenerate}
                isDisabled={
                  inProgress ||
                  descriptionValidationState === ValidatedOptions.error
                }
              >
                {t('Generate')}
              </Button>
              <Button
                variant={ButtonVariant.link}
                onClick={closeModal}
                isDisabled={inProgress}
              >
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </ButtonBar>,
        ]}
      >
        <FormGroup label={t('Username')} fieldId="username-input">
          <Content component="p" id="username-input">
            {userName}
          </Content>
        </FormGroup>
        <FormGroup
          label={t('Description tag')}
          fieldId="description-input"
          className="pf-v6-u-mt-md"
        >
          <TextInput
            id="description-input"
            type="text"
            value={description}
            onChange={(_event, value) => setDescription(value)}
            placeholder={t('Enter description')}
            aria-label={t('Description')}
            isDisabled={inProgress}
            validated={descriptionValidationState}
          />
          {descriptionValidationState === ValidatedOptions.error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={ValidatedOptions.error}>
                  {t('No more than {{maxLength}} characters', {
                    maxLength: MAX_DESCRIPTION_LENGTH,
                  })}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
          {descriptionValidationState !== ValidatedOptions.error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t(
                    'Maximum 256 characters. Use a combination of letters, numbers, spaces and special characters.'
                  )}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </FormGroup>
      </Modal>
    );
  };
