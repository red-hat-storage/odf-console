import * as React from 'react';
import {
  VECTOR_INDEX_NAME_MAX_LENGTH,
  VECTOR_INDEX_NAME_MIN_LENGTH,
} from '@odf/core/constants/s3-vectors';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import * as Yup from 'yup';

export type S3VectorIndexFormSchema = Yup.ObjectSchema<{
  vectorIndexName: Yup.StringSchema;
}>;

export type S3VectorIndexFormValidation = {
  vectorIndexSchema: S3VectorIndexFormSchema;
  fieldRequirements: string[];
};

const useS3VectorIndexFormValidation = (): S3VectorIndexFormValidation => {
  const { t } = useCustomTranslation();

  return React.useMemo(() => {
    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, VECTOR_INDEX_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, VECTOR_INDEX_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    ];

    const vectorIndexSchema = Yup.object({
      vectorIndexName: Yup.string()
        .max(VECTOR_INDEX_NAME_MAX_LENGTH, fieldRequirements[0])
        .min(VECTOR_INDEX_NAME_MIN_LENGTH, fieldRequirements[1])
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

    return {
      vectorIndexSchema:
        vectorIndexSchema as unknown as S3VectorIndexFormSchema,
      fieldRequirements,
    };
  }, [t]);
};

export default useS3VectorIndexFormValidation;
