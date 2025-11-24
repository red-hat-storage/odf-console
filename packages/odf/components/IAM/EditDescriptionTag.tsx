import * as React from 'react';
import { IAMClientConfig } from '@aws-sdk/client-iam';
import { useCustomTranslation } from '@odf/shared';
import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, HelpIcon } from '@patternfly/react-icons';
import { tagUser } from './IAMUserFunctions';
import { validateValue } from './validationUtils';

interface EditDescriptionTagProps {
  name: string;
  config: IAMClientConfig;
  AccessKeyId: string;
}

const EditDescriptionTag: React.FC<EditDescriptionTagProps> = ({
  name,
  config,
  AccessKeyId,
}) => {
  const { t } = useCustomTranslation();
  const [isOpen, setIsOpen] = React.useState<boolean>(true);
  const descriptiontagRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string>('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] =
    React.useState<boolean>(false);

  const handleSubmit = async (
    event: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    const value = descriptiontagRef.current?.value || '';
    const validationError = validateValue(value);

    if (validationError) {
      setError(validationError);
    } else {
      setError('');
      await tagUser(name, config, {
        Key: AccessKeyId,
        Value: value,
      });
      setIsOpen(false);
    }
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={
        <div className="pf-v5-u-display-flex pf-v5-u-justify-content-space-between pf-v5-u-pb-0">
          <Title headingLevel="h2">{t('Edit Description tag')} </Title>
          <Button variant="plain" icon={<HelpIcon />} />
        </div>
      }
      description={
        <div className="pf-v5-u-color-200">
          {t('Description tag will be attached to the accesskey for this user')}
        </div>
      }
    >
      <Form>
        <FormGroup
          label={
            <div className="pf-v5-u-pt-md">
              {t('Description tag ')}
              <HelpIcon className="pf-v5-u-color-200 pf-v5-u-ml-sm" />{' '}
            </div>
          }
        >
          <TextInput
            label={t('Value')}
            type="text"
            placeholder={t('Input field')}
            ref={descriptiontagRef}
            className="pf-v5-u-w-50"
            onChange={() => {
              // Clear error when user starts typing - don't validate while typing
              if (hasAttemptedSubmit && error) {
                setError('');
              }
            }}
          />

          {error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem
                  icon={<ExclamationCircleIcon />}
                  variant="error"
                >
                  {error}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}

          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t(
                  'Maximum allowed characters-256. Use combination of letters, numbers, special characters'
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup>
          <Button variant="primary" onClick={handleSubmit}>
            {t('Update')}
          </Button>
          <Button variant="plain" onClick={() => setIsOpen(false)}>
            {t('Cancel')}
          </Button>
        </FormGroup>
      </Form>
    </Modal>
  );
};

export default EditDescriptionTag;
