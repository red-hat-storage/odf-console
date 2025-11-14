import * as React from 'react';
import { formSettings, useYupValidationResolver } from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';

// Constants for validation
const SYSTEM_NAME_MAX_LENGTH = 63;
const SYSTEM_NAME_MIN_LENGTH = 3;
const LUN_GROUP_NAME_MAX_LENGTH = 63;
const LUN_GROUP_NAME_MIN_LENGTH = 1;

export type SANSystemFormSchema = Yup.ObjectSchema<{
  connectionName: Yup.StringSchema;
  lunGroupName: Yup.StringSchema;
}>;

export type SANSystemFormData = {
  connectionName: string;
  lunGroupName: string;
};

export type SANSystemFormValidation = {
  formSchema: SANSystemFormSchema;
  fieldRequirements: {
    connectionName: string[];
    lunGroupName: string[];
  };
  control: any;
  handleSubmit: any;
  formState: { isSubmitted: boolean };
  watch: any;
  getValues: any;
};

const useSANSystemFormValidation = (): SANSystemFormValidation => {
  const { t } = useCustomTranslation();

  const { formSchema, fieldRequirements } = React.useMemo(() => {
    // Connection name validation
    const connectionNameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, SYSTEM_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, SYSTEM_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    ];

    // LUN group name validation
    const lunGroupNameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, LUN_GROUP_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, LUN_GROUP_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    const formSchema = Yup.object({
      connectionName: Yup.string()
        .required(t('Connection name is required'))
        .max(SYSTEM_NAME_MAX_LENGTH, connectionNameFieldRequirements[0])
        .min(SYSTEM_NAME_MIN_LENGTH, connectionNameFieldRequirements[1])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          connectionNameFieldRequirements[2]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          connectionNameFieldRequirements[3]
        )
        .transform((value: string) => (!!value ? value : '')),

      lunGroupName: Yup.string()
        .required(t('LUN group name is required'))
        .max(LUN_GROUP_NAME_MAX_LENGTH, lunGroupNameFieldRequirements[0])
        .min(LUN_GROUP_NAME_MIN_LENGTH, lunGroupNameFieldRequirements[1])
        .transform((value: string) => (!!value ? value : '')),
    });

    return {
      formSchema: formSchema as unknown as SANSystemFormSchema,
      fieldRequirements: {
        connectionName: connectionNameFieldRequirements,
        lunGroupName: lunGroupNameFieldRequirements,
      },
    };
  }, [t]);

  const resolver = useYupValidationResolver(formSchema) as any;

  const {
    control,
    handleSubmit,
    formState: { isSubmitted },
    watch,
    getValues,
  } = useForm({
    ...formSettings,
    resolver,
    defaultValues: {
      connectionName: 'SAN-based storage',
      lunGroupName: '',
    },
  });

  return {
    formSchema,
    fieldRequirements,
    control,
    handleSubmit,
    formState: { isSubmitted },
    watch,
    getValues,
  };
};

export default useSANSystemFormValidation;
