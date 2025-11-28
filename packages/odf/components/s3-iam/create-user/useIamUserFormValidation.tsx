import * as React from 'react';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as Yup from 'yup';
import {
  USER_NAME_MIN_LENGTH,
  USER_NAME_MAX_LENGTH,
  USER_NAME_ALLOWED_CHARS_REGEX,
} from '../../../constants/s3-iam';
import {
  IamUserFormSchema,
  IamUserFormValidation,
} from '../../../types/s3-iam';

const useIamUserFormValidation = (): IamUserFormValidation => {
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
        .matches(USER_NAME_ALLOWED_CHARS_REGEX, fieldRequirements[2])
        .required(fieldRequirements[3])
        .test('not-empty', fieldRequirements[3], (value) => {
          return value ? value.trim().length > 0 : false;
        })
        .transform((value: string) => (!!value ? value.trim() : '')),
    });

    return {
      userFormSchema: userFormSchema as unknown as IamUserFormSchema,
      fieldRequirements,
    };
  }, [t]);
};

export default useIamUserFormValidation;
