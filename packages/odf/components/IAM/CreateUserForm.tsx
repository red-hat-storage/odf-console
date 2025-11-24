import * as React from 'react';
import { IAMClientConfig } from '@aws-sdk/client-iam';
import {
  useYupValidationResolver,
  formSettings,
  TextInputWithFieldRequirements,
  useCustomTranslation,
} from '@odf/shared';
import { useForm, Resolver } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  Alert,
  AlertVariant,
  FormHelperText,
  FormSection,
  Modal,
  ModalVariant,
  Title,
  Label,
  Flex,
  FlexItem,
  Page,
  PageSection,
  PageSectionVariants,
  PageBreadcrumb,
  Breadcrumb,
  BreadcrumbItem,
  TextContent,
  Text,
  HelperText,
  HelperTextItem,
  ButtonType,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  HelpIcon,
} from '@patternfly/react-icons';
import { AddKeyValuePairs, KeyValuePair } from './AddKeyValuePair';
import { createIAMUser, tagUser, useIAMClientConfig } from './IAMUserFunctions';
import useIAMUserFormValidation from './useIAMUserFormValidation';
import { validateKey, validateValue } from './validationUtils';

type FormData = {
  userName: string;
};

export const CreateUserForm = () => {
  const descriptiontagRef = React.useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const responseRef = React.useRef<any>(null);
  const config: IAMClientConfig = useIAMClientConfig();
  const [pairs, setPairs] = React.useState<KeyValuePair[]>([]);
  const [submitted, setSubmitted] = React.useState(false);
  const [tagErrors, setTagErrors] = React.useState('');
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const { userFormSchema, fieldRequirements } = useIAMUserFormValidation();
  const resolver = useYupValidationResolver(
    userFormSchema
  ) as unknown as Resolver<FormData>;

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitted },
  } = useForm<FormData>({
    ...(formSettings as any),
    resolver,
    defaultValues: {
      userName: '',
    },
  });

  const save = async (formData: FormData) => {
    setErrorMessage('');
    setTagErrors('');

    const { userName } = formData;

    // Validate all tags
    let keyError = '';
    let valueError = '';
    let hasTagErrors = false;

    pairs.forEach((pair) => {
      const Key = String(pair.Key || '').trim();
      const Value = String(pair.Value || '').trim();

      const currentKeyError = validateKey(Key);
      const currentValueError = validateValue(Value);

      if (currentKeyError && !keyError) {
        keyError = currentKeyError;
      }
      if (currentValueError && !valueError) {
        valueError = currentValueError;
      }
    });

    hasTagErrors = keyError !== '' || valueError !== '';

    // Validate description tag
    const descriptionTagValue = descriptiontagRef.current?.value || '';
    const descriptionTagError =
      descriptionTagValue.trim() !== ''
        ? validateValue(descriptionTagValue)
        : '';

    // If there are tag validation errors, show them and prevent submission
    if (hasTagErrors || descriptionTagError !== '') {
      let errors = '';

      if (hasTagErrors) {
        errors = keyError + (valueError ? '\n' + valueError : '');
      }

      if (descriptionTagError) {
        errors =
          errors +
          (errors ? '\n' : '') +
          'Description tag: ' +
          descriptionTagError;
      }

      setTagErrors(errors);
      setErrorMessage(t('Address tag validation errors before submitting.'));
      return;
    }

    try {
      pairs.length !== 0
        ? (responseRef.current = await createIAMUser(userName, config, pairs))
        : (responseRef.current = await createIAMUser(userName, config));

      await tagUser(userName, config, {
        Key: responseRef.current.AccessKey.AccessKeyId,
        Value: descriptionTagValue,
      });
      //console.log('Submitted value:', userName, pairs, descriptiontagRef.current?.value);
      setSubmitted(true);
    } catch (error: any) {
      const { name, message } = error;
      setErrorMessage(t(`Error while creating user: ${name}: ${message}`));
    }
  };

  return (
    <>
      <Page>
        <PageBreadcrumb>
          <Breadcrumb>
            <Link to="IAM">
              {' '}
              <BreadcrumbItem>{t('IAM')}</BreadcrumbItem>{' '}
            </Link>
            <BreadcrumbItem isActive>{t('Create user')}</BreadcrumbItem>
          </Breadcrumb>
        </PageBreadcrumb>
        <PageSection variant={PageSectionVariants.light} isFilled>
          <Form onSubmit={handleSubmit(save)} className="pf-v5-u-w-75">
            <TextContent>
              <Title headingLevel="h1">{t('Create user')}</Title>
              <Text component="p" className="pf-v5-u-color-200">
                {t(
                  'Create users to generate and manage accesskeys and policies.'
                )}
              </Text>
            </TextContent>
            <FormSection>
              <Alert
                variant="info"
                title={t('Creating user will generate accesskey and secretkey')}
                ouiaId="InfoAlert"
              />

              {!isValid && isSubmitted && (
                <Alert
                  variant={AlertVariant.danger}
                  isInline
                  title={t('Address form validation errors to proceed')}
                />
              )}

              {errorMessage && isValid && (
                <Alert
                  variant={AlertVariant.danger}
                  isInline
                  title={errorMessage}
                >
                  {tagErrors && (
                    <div style={{ whiteSpace: 'pre-line' }}>{tagErrors}</div>
                  )}
                </Alert>
              )}

              <TextInputWithFieldRequirements
                control={control as any}
                fieldRequirements={fieldRequirements}
                popoverProps={{
                  headerContent: t('Name requirements'),
                  footerContent: t('Example: my-user'),
                }}
                formGroupProps={{
                  label: t('Username'),
                  fieldId: 'user-name',
                  isRequired: true,
                  labelIcon: <HelpIcon className="pf-v5-u-color-200" />,
                }}
                textInputProps={{
                  id: 'user-name',
                  name: 'userName',
                  type: 'text',
                  placeholder: t('Input field'),
                  'aria-describedby': 'user-name-help',
                  'data-test': 'user-name',
                }}
              />

              <AddKeyValuePairs
                pairs={pairs}
                setPairs={setPairs}
                disableAddTags={!isValid}
              />

              <FormGroup>
                <label className="pf-v5-u-pt-sm">
                  {t('Description tag')}
                  <div className="pf-v5-u-pt-md">
                    {t('Value ')}
                    <HelpIcon className="pf-v5-u-color-200 pf-v5-u-ml-sm" />{' '}
                  </div>
                </label>
                <TextInput
                  label={t('Value')}
                  type="text"
                  placeholder={t('Input field')}
                  ref={descriptiontagRef}
                  className="pf-v5-u-w-50"
                  isDisabled={!isValid}
                />
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

              <ActionGroup className="pf-v5-c-form">
                <Button
                  isDisabled={!isValid}
                  variant="primary"
                  type={ButtonType.submit}
                  data-test="create-user"
                >
                  {t('Create')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('IAM')}
                  type="button"
                >
                  {t('Cancel')}
                </Button>
              </ActionGroup>
            </FormSection>
          </Form>
        </PageSection>
      </Page>

      {submitted && (
        <AccessKeySecretKeyDispModal
          isOpen={submitted}
          setIsOpen={setSubmitted}
          navigate={navigate}
          AccessKeyId={responseRef.current.AccessKey.AccessKeyId}
          SecretKey={responseRef.current.AccessKey.SecretAccessKey}
          title={t('User created')}
        />
      )}
    </>
  );
};

export default CreateUserForm;

export type AccessKeySecretKeyDispModalProps = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navigate?: ReturnType<typeof useNavigate>;
  AccessKeyId: string;
  SecretKey: string;
  title: string;
};

export const AccessKeySecretKeyDispModal: React.FC<
  AccessKeySecretKeyDispModalProps
> = ({ isOpen, setIsOpen, navigate, AccessKeyId, SecretKey, title }) => {
  const { t } = useCustomTranslation();
  const [hide, setHide] = React.useState(true);
  const handleCopy = () => {
    navigator.clipboard.writeText(SecretKey);
  };

  const handleDownload = () => {
    const csvContent = `AcesssKey and SecretKey, Value \nAccessKey: ,${AccessKeyId}\nSecretKey: ,${SecretKey}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Accesskey and Secret key information.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        navigate?.('IAM');
      }}
      title={
        <div className="pf-v5-u-display-flex pf-v5-u-justify-content-space-between pf-v5-u-pb-0">
          <Title headingLevel="h2">
            <CheckCircleIcon
              color="var(--pf-v5-global--success-color--100)"
              className="pf-v5-u-mr-sm"
            />
            {t(title)}
          </Title>
          <Button variant="plain" icon={<HelpIcon />} />
        </div>
      }
    >
      <Form>
        <Alert
          variant="warning"
          title={t(
            'Important : Write down or download secret key as it will be displayed once.'
          )}
          actionLinks={
            <Button variant="link" onClick={handleDownload}>
              <span style={{ textDecoration: 'underline' }}>
                {t('Download secretkey')}
              </span>
            </Button>
          }
        />
        <FormSection title={t('Accesskey information')} titleElement="div">
          <FormGroup
            label={
              <>
                {t('Accesskey ')}
                <Label
                  className="pf-v5-u-ml-xs"
                  icon={<CheckCircleIcon />}
                  color="green"
                >
                  {t('Active')}
                </Label>
                <Label className="pf-v5-u-ml-xs" color="cyan">
                  {t('Primary')}
                </Label>
              </>
            }
          >
            <TextInput readOnly readOnlyVariant="plain" value={AccessKeyId} />
          </FormGroup>
          <FormGroup label={t('Secretkey')}>
            <Flex spaceItems={{ default: 'spaceItemsNone' }}>
              <FlexItem>
                <TextInput
                  readOnly
                  readOnlyVariant="plain"
                  value={!hide ? SecretKey : '*'.repeat(SecretKey.length)}
                />
              </FlexItem>
              <FlexItem>
                <Button
                  variant="plain"
                  onClick={() => {
                    setHide(!hide);
                  }}
                >
                  {hide ? <EyeIcon /> : <EyeSlashIcon />}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button variant="plain" onClick={handleCopy}>
                  <CopyIcon />
                </Button>
              </FlexItem>
            </Flex>
          </FormGroup>
        </FormSection>
        <ActionGroup>
          <Button
            variant="secondary"
            onClick={() => {
              setIsOpen(false);
              navigate?.('IAM');
            }}
          >
            {t('Done')}
          </Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
