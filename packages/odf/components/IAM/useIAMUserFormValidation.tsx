import * as React from 'react';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as Yup from 'yup';

export type IAMUserFormSchema = Yup.ObjectSchema<{
  userName: Yup.StringSchema;
}>;

export type IAMUserFormValidation = {
  userFormSchema: IAMUserFormSchema;
  fieldRequirements: string[];
};

const USER_NAME_MIN_LENGTH = 1;
const USER_NAME_MAX_LENGTH = 64;

const useIAMUserFormValidation = (): IAMUserFormValidation => {
  const { t } = useCustomTranslation();

  return React.useMemo(() => {
    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, USER_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, USER_NAME_MIN_LENGTH),
      t('Only A-Z, a-z, 0-9, and + = , . @ _ - are allowed.'),
      t('Username cannot be empty.'),
    ];

    const userFormSchema = Yup.object({
      userName: Yup.string()
        .max(USER_NAME_MAX_LENGTH, fieldRequirements[0])
        .min(USER_NAME_MIN_LENGTH, fieldRequirements[1])
        .matches(/^[A-Za-z0-9+=,.@_-]*$/, fieldRequirements[2])
        .required(fieldRequirements[3])
        .test('not-empty', fieldRequirements[3], (value) => {
          return value ? value.trim().length > 0 : false;
        })
        .transform((value: string) => (!!value ? value.trim() : '')),
    });

    return {
      userFormSchema: userFormSchema as unknown as IAMUserFormSchema,
      fieldRequirements,
    };
  }, []);
};

export default useIAMUserFormValidation;
