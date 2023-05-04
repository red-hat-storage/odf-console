import * as React from 'react';
import { getExternalStorage } from '@odf/core/components/utils';
import { IBMFlashSystemModel } from "@odf/ibm/system-models";
import { IBMFlashSystemKind } from "@odf/ibm/system-types";
import {
  StorageClassWizardStepExtensionProps as ExternalStorage,
  ExternalStateValues,
} from '@odf/odf-plugin-sdk/extensions';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { SecretModel, StorageClassModel } from '@odf/shared/models';
import { getFlashSystemSecretName, getName, getSecretManagementAddress } from '@odf/shared/selectors';
import { SecretKind, StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isIPRegistered, isValidIP } from '@odf/shared/utils';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { Form, TextContent, TextVariants, Text } from '@patternfly/react-core';
import validationRegEx from '../../../../utils/validation';
import { WizardDispatch, WizardState } from '../../reducer';
import './create-storage-class-step.scss';

export const CreateStorageClass: React.FC<CreateStorageClassProps> = ({
  state,
  storageClass,
  externalStorage,
  dispatch,
  supportedExternalStorage,
}) => {
  const { t } = useCustomTranslation();

  const { component: Component, displayName } = getExternalStorage(
    externalStorage,
    supportedExternalStorage
  ) || {
    Component: null,
    displayName: '',
  };

  const setForm = React.useCallback(
    (field: string, value: ExternalStateValues) =>
      dispatch({
        type: 'wizard/setCreateStorageClass',
        payload: {
          field,
          value,
        },
      }),
    [dispatch]
  );

  const [data, loaded, loadError] =
    useK8sList<StorageSystemKind>(StorageClassModel);

  const [secretData, secretLoaded, secretLoadError] =
    useK8sList<SecretKind>(SecretModel);

  const [flashSystemData, flashSystemLoaded, flashSystemLoadError] =
    useK8sList<IBMFlashSystemKind>(IBMFlashSystemModel);

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((data) => getName(data)) : [];

    const existingFlashSystemSecretNames =
        flashSystemLoaded && !flashSystemLoadError ? flashSystemData?.map((data) => getFlashSystemSecretName(data)) : [];

    const existingSecretManagementAddresses =
        existingFlashSystemSecretNames.map((secretName) => {
            const secret = secretData.find((secret) => secret.metadata.name === secretName);
            return atob(getSecretManagementAddress(secret));
        });

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const schema = Yup.object({
      'storage-class-name': Yup.string()
        .required()
        .max(253, fieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[2]
        )
        .test(
          'unique-name',
          fieldRequirements[3],
          (value: string) => !existingNames.includes(value)
        ),
      'endpoint-input': Yup.string()
        .required()
        .test(
          'ip-address',
          t('The endpoint is not a valid IP address'),
          (value: string) => isValidIP(value)
        )
        .test(
          'unique-ip-address',
          t('The IP address is already registered'),
            (value: string) => !isIPRegistered(value, existingSecretManagementAddresses)
        ),
      'username-input': Yup.string().required(),
      'password-input': Yup.string().required(),
      'poolname-input': Yup.string().required(),
    });

    return { schema, fieldRequirements };
  }, [loaded, loadError, data, flashSystemLoaded, flashSystemLoadError, flashSystemData, t, secretData]);
  const resolver = useYupValidationResolver(schema);
  const {
    control,
    watch,
    formState: { isValid },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const storageClassName: string = watch('storage-class-name');

  React.useEffect(() => {
    dispatch({
      type: 'wizard/setStorageClass',
      payload: {
        name: isValid ? storageClassName : '',
      },
    });
  }, [storageClassName, dispatch, isValid]);

  return (
    <Form className="odf-create-storage-class__form">
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        defaultValue={storageClass.name}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-storage-class`,
        }}
        formGroupProps={{
          label: t('StorageClass name'),
          fieldId: 'storage-class-name',
        }}
        textInputProps={{
          id: 'storage-class-name',
          name: 'storage-class-name',
          'data-test': 'storage-class-name',
        }}
      />
      <TextContent>
        <Text component={TextVariants.h4}>
          {t('{{displayName}} connection details', { displayName })}
        </Text>
      </TextContent>
      {Component && (
        <Component control={control} setFormState={setForm} formState={state} />
      )}
    </Form>
  );
};

type CreateStorageClassProps = {
  state: WizardState['createStorageClass'];
  externalStorage: WizardState['backingStorage']['externalStorage'];
  storageClass: WizardState['storageClass'];
  dispatch: WizardDispatch;
  supportedExternalStorage: ExternalStorage[];
};
