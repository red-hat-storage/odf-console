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
import * as _ from 'lodash-es';
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
  AccessKeyStatus,
  TAG_VALUE_MAX_LENGTH,
  IAM_BASE_ROUTE,
  CREATE_IAM_USER_MUTATION_KEY,
  UPDATE_ACCESS_KEY_CLEANUP_MUTATION_KEY,
  DELETE_ACCESS_KEY_CLEANUP_MUTATION_KEY,
  DELETE_USER_POLICY_CLEANUP_MUTATION_KEY,
  DELETE_IAM_USER_CLEANUP_MUTATION_KEY,
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
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const { iamClient } = React.useContext(IamContext);
  const [pairs, setPairs] = React.useState<KeyValuePair[]>([]);
  const [tagErrors, setTagErrors] = React.useState('');
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const launchModal = useModal();

  const {
    trigger: updateAccessKey,
    isMutating: isUpdatingAccessKey,
    error: updateAccessKeyError,
  } = useSWRMutation(
    UPDATE_ACCESS_KEY_CLEANUP_MUTATION_KEY,
    async (
      _key,
      { arg }: { arg: { userName: string; accessKeyId: string } }
    ) => {
      await iamClient.updateAccessKey({
        UserName: arg.userName,
        AccessKeyId: arg.accessKeyId,
        Status: AccessKeyStatus.INACTIVE,
      });
    }
  );

  const {
    trigger: deleteAccessKey,
    isMutating: isDeletingAccessKey,
    error: deleteAccessKeyError,
  } = useSWRMutation(
    DELETE_ACCESS_KEY_CLEANUP_MUTATION_KEY,
    async (
      _key,
      { arg }: { arg: { userName: string; accessKeyId: string } }
    ) => {
      await iamClient.deleteAccessKey({
        UserName: arg.userName,
        AccessKeyId: arg.accessKeyId,
      });
    }
  );

  const {
    trigger: deleteUserPolicy,
    isMutating: isDeletingUserPolicy,
    error: deleteUserPolicyError,
  } = useSWRMutation(
    DELETE_USER_POLICY_CLEANUP_MUTATION_KEY,
    async (_key, { arg }: { arg: { userName: string } }) => {
      await iamClient.deleteUserPolicy({
        UserName: arg.userName,
        PolicyName: POLICY_NAME,
      });
    }
  );

  const {
    trigger: deleteIAMUser,
    isMutating: isDeletingUser,
    error: deleteUserError,
  } = useSWRMutation(
    DELETE_IAM_USER_CLEANUP_MUTATION_KEY,
    async (_key, { arg }: { arg: { userName: string } }) => {
      await iamClient.deleteIamUser({
        UserName: arg.userName,
      });
    }
  );

  const isCleanupInProgress =
    isUpdatingAccessKey ||
    isDeletingAccessKey ||
    isDeletingUserPolicy ||
    isDeletingUser;

  const {
    trigger: createUser,
    isMutating: isCreatingUser,
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
      let userCreated = false;
      let accessKeyCreated = false;
      let policyCreated = false;
      let accessKeyId: string | undefined;
      let accessKeyResponse: any;

      try {
        const userInput = {
          UserName: userNameArg,
          ...(pairsArg.length !== 0 && { Tags: pairsArg }),
        };
        await iamClient.createIamUser(userInput);
        userCreated = true;

        accessKeyResponse = await iamClient.createAccessKey({
          UserName: userNameArg,
        });
        accessKeyCreated = true;
        accessKeyId = accessKeyResponse.AccessKey.AccessKeyId;

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
        policyCreated = true;

        return {
          accessKeyResponse,
          userCreated,
          accessKeyCreated,
          accessKeyId,
        };
      } catch (error: any) {
        let accessKeyDeleted = false;
        let policyDeleted = false;

        if (accessKeyCreated && accessKeyId) {
          let deactivationSucceeded = false;
          await updateAccessKey({ userName: userNameArg, accessKeyId })
            .then(() => {
              deactivationSucceeded = true;
            })
            .catch(_.noop);

          if (deactivationSucceeded) {
            await deleteAccessKey({ userName: userNameArg, accessKeyId })
              .then(() => {
                accessKeyDeleted = true;
              })
              .catch(_.noop);
          }
        } else {
          accessKeyDeleted = true;
        }

        if (policyCreated) {
          await deleteUserPolicy({ userName: userNameArg })
            .then(() => {
              policyDeleted = true;
            })
            .catch(_.noop);
        } else {
          // Policy was never created, so no need to delete it
          policyDeleted = true;
        }

        // Only delete user if access key and policy cleanup completed successfully
        // (or if they were never created)
        if (userCreated && accessKeyDeleted && policyDeleted) {
          await deleteIAMUser({ userName: userNameArg }).catch(_.noop);
        }

        throw error;
      }
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

  const isSubmitting = isCreatingUser || isCleanupInProgress;

  const aggregatedErrorMessage = React.useMemo(() => {
    const errors: string[] = [];
    if (!isValid && isSubmitted) {
      errors.push(t('Address form validation errors to proceed'));
    }
    if (errorMessage) {
      errors.push(errorMessage);
    }
    if (tagErrors) {
      errors.push(tagErrors);
    }
    return errors.join('\n\n');
  }, [isValid, isSubmitted, errorMessage, tagErrors, t]);

  React.useEffect(() => {
    const errors: string[] = [];

    if (createError) {
      errors.push(createError.message || JSON.stringify(createError));
    }

    const cleanupErrors: string[] = [];
    if (updateAccessKeyError) {
      cleanupErrors.push(
        updateAccessKeyError?.message || JSON.stringify(updateAccessKeyError)
      );
    }
    if (deleteAccessKeyError) {
      cleanupErrors.push(
        deleteAccessKeyError?.message || JSON.stringify(deleteAccessKeyError)
      );
    }
    if (deleteUserPolicyError) {
      cleanupErrors.push(
        deleteUserPolicyError?.message || JSON.stringify(deleteUserPolicyError)
      );
    }
    if (deleteUserError) {
      cleanupErrors.push(
        deleteUserError?.message || JSON.stringify(deleteUserError)
      );
    }

    if (cleanupErrors.length > 0) {
      if (errors.length > 0) {
        errors.push(''); // Add spacing
      }
      errors.push(t('Cleanup errors:'));
      errors.push(...cleanupErrors);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join('\n'));
    } else {
      setErrorMessage('');
    }
  }, [
    createError,
    updateAccessKeyError,
    deleteAccessKeyError,
    deleteUserPolicyError,
    deleteUserError,
    t,
  ]);

  const save = async (formData: FormData) => {
    setErrorMessage('');
    setTagErrors('');

    const { userName } = formData;

    let keyError = '';
    let valueError = '';
    let hasTagErrors = false;

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

    hasTagErrors = keyError !== '' || valueError !== '';

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

      setTagErrors(errors);
      setErrorMessage(t('Address tag validation errors before submitting.'));
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
      // Error is already caught by useSWRMutation and surfaced via useEffect
    }
  };

  return (
    <Page>
      <PageBreadcrumb>
        <Breadcrumb>
          <BreadcrumbItem>
            {isSubmitting ? (
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
              inProgress={isSubmitting}
            >
              <ActionGroup className="pf-v5-c-form">
                <Button
                  isDisabled={!isValid || isSubmitting}
                  isLoading={isSubmitting}
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
                  isDisabled={isSubmitting}
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
