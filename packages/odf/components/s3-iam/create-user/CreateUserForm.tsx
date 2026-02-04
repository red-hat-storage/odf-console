import * as React from 'react';
import {
  useYupValidationResolver,
  formSettings,
  TextInputWithFieldRequirements,
  useCustomTranslation,
} from '@odf/shared';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { CommonModalProps } from '@odf/shared/modals/common';
import { useModal } from '@openshift-console/dynamic-plugin-sdk';
import { useForm, Resolver } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom-v5-compat';
import useSWRMutation from 'swr/mutation';
import {
  Form,
  FormGroup,
  TextInput,
  ActionGroup,
  Button,
  Alert,
  FormHelperText,
  FormSection,
  Title,
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
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  TAG_VALUE_MAX_LENGTH,
  IAM_BASE_ROUTE,
  CREATE_IAM_USER_MUTATION_KEY,
  POLICY_DOCUMENT,
  POLICY_NAME,
} from '../../../constants/s3-iam';
import {
  AccessKeySecretKeyDisplayModal,
  AccessKeySecretKeyDisplayModalProps,
} from '../../../modals/s3-iam/AccessKeySecretKeyDisplayModal';
import { KeyValuePair } from '../../../types/s3-iam';
import { getKeyValidations, getValueValidations } from '../../../utils/s3-iam';
import useIamUserFormValidation from '../hooks/useIamUserFormValidation';
import { IamContext, IamProvider } from '../iam-context';
import { AddKeyValuePairs } from './AddKeyValuePair';

type FormData = {
  userName: string;
};

export const CreateUserFormContent = () => {
  const [descriptionTagValue, setDescriptionTagValue] =
    React.useState<string>('');
  const { iamClient } = React.useContext(IamContext);
  const [pairs, setPairs] = React.useState<KeyValuePair[]>([]);
  const [tagErrors, setTagErrors] = React.useState('');
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const launchModal = useModal();

  const {
    trigger: createUser,
    isMutating: inProgress,
    error: createError,
  } = useSWRMutation(
    CREATE_IAM_USER_MUTATION_KEY,
    async (
      _key,
      {
        arg,
      }: {
        arg: {
          userName: string;
          pairs: KeyValuePair[];
          descriptionTagValue: string;
        };
      }
    ) => {
      const {
        userName: userNameArg,
        pairs: pairsArg,
        descriptionTagValue: descriptionTagValueArg,
      } = arg;

      const userInput = {
        UserName: userNameArg,
        ...(pairsArg.length !== 0 && { Tags: pairsArg }),
      };
      await iamClient.createIamUser(userInput);

      const accessKeyResponse = await iamClient.createAccessKey({
        UserName: userNameArg,
      });

      const allTags: KeyValuePair[] = [...pairsArg];
      allTags.push({
        Key: accessKeyResponse.AccessKey.AccessKeyId,
        Value: descriptionTagValueArg,
      });
      await iamClient.tagUser({
        UserName: userNameArg,
        Tags: allTags,
      });

      await iamClient.putUserPolicy({
        UserName: userNameArg,
        PolicyDocument: POLICY_DOCUMENT,
        PolicyName: POLICY_NAME,
      });

      return { accessKeyResponse };
    }
  );

  const { userFormSchema, fieldRequirements } = useIamUserFormValidation();
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

  const aggregatedErrorMessage = [
    !isValid && isSubmitted && t('Address form validation errors to proceed'),
    createError && (createError.message || JSON.stringify(createError)),
    tagErrors,
  ]
    .filter(Boolean)
    .join('\n\n');

  const save = async (formData: FormData) => {
    setTagErrors('');

    const { userName } = formData;

    let keyError = '';
    let valueError = '';

    pairs.forEach((pair) => {
      const Key = String(pair.Key || '').trim();
      const Value = String(pair.Value || '').trim();

      const [keyValidationVariant, keyHelperText] = getKeyValidations(Key, t);
      const [valueValidationVariant, valueHelperText] = getValueValidations(
        Value,
        t
      );

      if (keyValidationVariant === ValidatedOptions.error && !keyError) {
        keyError = keyHelperText;
      }
      if (valueValidationVariant === ValidatedOptions.error && !valueError) {
        valueError = valueHelperText;
      }
    });

    const hasTagErrors = keyError !== '' || valueError !== '';

    const [descriptionTagValidationVariant, descriptionTagHelperText] =
      getValueValidations(descriptionTagValue.trim(), t);
    const descriptionTagError =
      descriptionTagValidationVariant === ValidatedOptions.error
        ? descriptionTagHelperText
        : '';

    if (hasTagErrors || descriptionTagError !== '') {
      let errors = '';

      if (hasTagErrors) {
        errors = keyError + (valueError ? '\n' + valueError : '');
      }

      if (descriptionTagError) {
        errors =
          errors +
          (errors ? '\n' : '') +
          t('Description tag: ') +
          descriptionTagError;
      }

      setTagErrors(
        t('Address tag validation errors before submitting.') + '\n\n' + errors
      );
      return;
    }

    try {
      const result = await createUser({
        userName,
        pairs,
        descriptionTagValue,
      });

      if (result?.accessKeyResponse) {
        launchModal(AccessKeySecretKeyDisplayModal, {
          isOpen: true,
          extraProps: {
            AccessKeyId: result.accessKeyResponse.AccessKey.AccessKeyId,
            SecretKey: result.accessKeyResponse.AccessKey.SecretAccessKey,
            title: t('User created successfully'),
            buttonText: t('Back to IAM'),
            navigateTo: IAM_BASE_ROUTE,
          },
        } as CommonModalProps<AccessKeySecretKeyDisplayModalProps>);
      }
    } catch (_error) {
      // Error is already caught by useSWRMutation and surfaced via createError in aggregatedErrorMessage
    }
  };

  return (
    <Page>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem>
            {inProgress ? (
              t('IAM')
            ) : (
              <Link to={IAM_BASE_ROUTE}>{t('IAM')}</Link>
            )}
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{t('Create user')}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
      <PageSection variant={PageSectionVariants.light} isFilled>
        <Form onSubmit={handleSubmit(save)} className="pf-v5-u-w-75">
          <TextContent>
            <Title headingLevel="h1">{t('Create user')}</Title>
            <Text component="p" className="text-muted">
              {t(
                'Create users to generate and manage access keys and policies.'
              )}
            </Text>
          </TextContent>
          <FormSection>
            <Alert
              variant="info"
              title={t('Creating user will generate access key and secret key')}
              ouiaId="InfoAlert"
            />

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

            <AddKeyValuePairs pairs={pairs} setPairs={setPairs} />

            <FormGroup>
              <label className="pf-v5-u-pt-sm">
                {t('Description tag')}
                <div className="pf-v5-u-pt-md">{t('Value')}</div>
              </label>
              <TextInput
                type="text"
                placeholder={t('Input field')}
                value={descriptionTagValue}
                onChange={(_event, value) => setDescriptionTagValue(value)}
                className="pf-v5-u-w-50"
                isDisabled={!isValid}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    {t(
                      `Maximum allowed characters - ${TAG_VALUE_MAX_LENGTH}. Use combination of letters, numbers, special characters`
                    )}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>

            <ButtonBar
              errorMessage={aggregatedErrorMessage}
              inProgress={inProgress}
            >
              <ActionGroup className="pf-v5-c-form">
                <Button
                  isDisabled={!isValid || inProgress}
                  isLoading={inProgress}
                  variant="primary"
                  type={ButtonType.submit}
                  data-test="create-user"
                >
                  {t('Create')}
                </Button>
                <Button
                  variant="plain"
                  onClick={() => navigate(IAM_BASE_ROUTE)}
                  type="button"
                  isDisabled={inProgress}
                >
                  {t('Cancel')}
                </Button>
              </ActionGroup>
            </ButtonBar>
          </FormSection>
        </Form>
      </PageSection>
    </Page>
  );
};

const CreateUserForm = () => {
  return (
    <IamProvider>
      <CreateUserFormContent />
    </IamProvider>
  );
};

export default CreateUserForm;
