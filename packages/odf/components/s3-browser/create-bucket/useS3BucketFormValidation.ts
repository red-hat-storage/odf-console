import * as React from 'react';
import {
  BUCKET_NAME_MAX_LENGTH,
  BUCKET_NAME_MIN_LENGTH,
} from '@odf/core/constants';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import * as Yup from 'yup';

export type S3BucketFormSchema = Yup.ObjectSchema<{
  bucketName: Yup.StringSchema;
}>;

export type S3BucketFormValidation = {
  bucketFormSchema: S3BucketFormSchema;
  fieldRequirements: string[];
};

const useS3BucketFormValidation = (): S3BucketFormValidation => {
  const { t } = useCustomTranslation();

  return React.useMemo(() => {
    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, BUCKET_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, BUCKET_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    ];

    const bucketFormSchema = Yup.object({
      bucketName: Yup.string()
        .max(BUCKET_NAME_MAX_LENGTH, fieldRequirements[0])
        .min(BUCKET_NAME_MIN_LENGTH, fieldRequirements[1])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[2]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[3]
        )
        .transform((value: string) => (!!value ? value : '')),
    });

    return { bucketFormSchema, fieldRequirements };
  }, [t]);
};

export default useS3BucketFormValidation;
