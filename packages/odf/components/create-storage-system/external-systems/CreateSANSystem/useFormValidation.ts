import * as React from 'react';
import { formSettings, useYupValidationResolver } from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
    // LUN group name validation - use object for robust mapping
    const lunGroupNameFieldRequirements = {
      maxChars: fieldRequirementsTranslations.maxChars(
        t,
        LUN_GROUP_NAME_MAX_LENGTH
      ),
      minChars: fieldRequirementsTranslations.minChars(
        t,
        LUN_GROUP_NAME_MIN_LENGTH
      ),
      cannotBeEmpty: fieldRequirementsTranslations.cannotBeEmpty(t),
    };

    const formSchema = Yup.object({
      lunGroupName: Yup.string()
        .required(t('LUN group name is required'))
        .max(LUN_GROUP_NAME_MAX_LENGTH, lunGroupNameFieldRequirements.maxChars)
        .min(LUN_GROUP_NAME_MIN_LENGTH, lunGroupNameFieldRequirements.minChars)
        .transform((value: string) => (!!value ? value : '')),
    });

    return {
      formSchema: formSchema as unknown as SANSystemFormSchema,
      fieldRequirements: {
        lunGroupName: Object.values(lunGroupNameFieldRequirements),
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
