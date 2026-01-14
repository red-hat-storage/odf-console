import * as React from 'react';
import { formSettings, useYupValidationResolver } from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import {
  useForm,
  Control,
  UseFormHandleSubmit,
  UseFormWatch,
  UseFormGetValues,
  FieldValues,
} from 'react-hook-form';
import * as Yup from 'yup';

const LUN_GROUP_NAME_MAX_LENGTH = 63;
const LUN_GROUP_NAME_MIN_LENGTH = 1;

export type SANSystemFormSchema = Yup.ObjectSchema<{
  lunGroupName: Yup.StringSchema;
}>;

export type SANSystemFormData = {
  lunGroupName: string;
};

export type SANSystemFormValidation = {
  formSchema: SANSystemFormSchema;
  fieldRequirements: {
    lunGroupName: string[];
  };
  control: Control<FieldValues>;
  handleSubmit: UseFormHandleSubmit<SANSystemFormData>;
  formState: { isSubmitted: boolean };
  watch: UseFormWatch<SANSystemFormData>;
  getValues: UseFormGetValues<SANSystemFormData>;
};

const useSANSystemFormValidation = (): SANSystemFormValidation => {
  const { t } = useCustomTranslation();

  const { formSchema, fieldRequirements } = React.useMemo(() => {
    // LUN group name validation - Kubernetes resource name validation
    const lunGroupNameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, LUN_GROUP_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    const formSchema = Yup.object({
      lunGroupName: Yup.string()
        .required(t('LUN group name is required'))
        .max(LUN_GROUP_NAME_MAX_LENGTH, lunGroupNameFieldRequirements[0])
        .min(LUN_GROUP_NAME_MIN_LENGTH, lunGroupNameFieldRequirements[3])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          lunGroupNameFieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          lunGroupNameFieldRequirements[2]
        )
        .transform((value: string) => (!!value ? value : '')),
    });

    return {
      formSchema: formSchema as unknown as SANSystemFormSchema,
      fieldRequirements: {
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
      lunGroupName: '',
    },
  });

  return {
    formSchema,
    fieldRequirements,
    control: control as Control<FieldValues>,
    handleSubmit: handleSubmit as UseFormHandleSubmit<SANSystemFormData>,
    formState: { isSubmitted },
    watch: watch as unknown as UseFormWatch<SANSystemFormData>,
    getValues: getValues as unknown as UseFormGetValues<SANSystemFormData>,
  };
};

export default useSANSystemFormValidation;
