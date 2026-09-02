import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { PersistentVolumeClaimKind } from '@odf/shared/types';
import validationRegEx from '@odf/shared/utils/validation';
import { TFunction } from 'i18next';
import * as Yup from 'yup';
import { StoreProviders } from './mcg';

export const TARGET_BUCKET_MIN = 3;
export const TARGET_BUCKET_MAX = 63;

export type TargetBucketMessages = {
  minChars: string;
  maxChars: string;
  startAndEnd: string;
  alphaNumeric: string;
};

export const getTargetBucketFieldRequirements = (t: TFunction): string[] => [
  fieldRequirementsTranslations.minChars(t, TARGET_BUCKET_MIN),
  fieldRequirementsTranslations.maxChars(t, TARGET_BUCKET_MAX),
  fieldRequirementsTranslations.startAndEndName(t),
  fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
];

export const providerSchema = (
  shouldValidateSecret: boolean,
  targetBucketMessages?: TargetBucketMessages
) =>
  Yup.object({
    'provider-name': Yup.string().required(),
    endpoint: Yup.string().when('provider-name', {
      is: (value: string) =>
        [StoreProviders.S3, StoreProviders.IBM].includes(
          value as StoreProviders
        ),
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'aws-region': Yup.string().when('provider-name', {
      is: StoreProviders.AWS,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    secret: Yup.string().when('provider-name', {
      is: (value: string) =>
        [
          StoreProviders.AWS,
          StoreProviders.S3,
          StoreProviders.AZURE,
          StoreProviders.IBM,
        ].includes(value as StoreProviders),
      then: (schema: Yup.StringSchema) =>
        shouldValidateSecret ? schema.required() : schema.notRequired(),
    }),
    'secret-key': Yup.string().when('provider-name', {
      is: StoreProviders.GCP,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'target-bucket': Yup.string().when('provider-name', {
      is: (value: string) =>
        [
          StoreProviders.S3,
          StoreProviders.AWS,
          StoreProviders.AZURE,
          StoreProviders.IBM,
          StoreProviders.GCP,
        ].includes(value as StoreProviders),
      then: (schema: Yup.StringSchema) =>
        targetBucketMessages
          ? schema
              .required()
              .min(TARGET_BUCKET_MIN, targetBucketMessages.minChars)
              .max(TARGET_BUCKET_MAX, targetBucketMessages.maxChars)
              .matches(
                validationRegEx.startAndEndsWithAlphanumerics,
                targetBucketMessages.startAndEnd
              )
              .matches(
                validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
                targetBucketMessages.alphaNumeric
              )
          : schema.required(),
    }),
    'pvc-name': Yup.object().when('provider-name', {
      is: StoreProviders.FILESYSTEM,
      then: (schema: Yup.ObjectSchema<PersistentVolumeClaimKind>) =>
        schema.required(),
    }),
    'folder-name': Yup.string().when('provider-name', {
      is: StoreProviders.FILESYSTEM,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
  });
