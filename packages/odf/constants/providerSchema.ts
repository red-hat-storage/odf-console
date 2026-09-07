import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { PersistentVolumeClaimKind } from '@odf/shared/types';
import { isValidIP } from '@odf/shared/utils';
import validationRegEx from '@odf/shared/utils/validation';
import { TFunction } from 'i18next';
import * as Yup from 'yup';
import { StoreProviders } from './mcg';

export const providerSchema = (shouldValidateSecret: boolean, t?: TFunction) =>
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
        schema
          .required()
          .min(3, t ? t('3-63 characters') : undefined)
          .max(63, t ? t('3-63 characters') : undefined)
          .matches(
            validationRegEx.startAndEndsWithAlphanumerics,
            t ? fieldRequirementsTranslations.startAndEndName(t) : undefined
          )
          .matches(
            validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
            t
              ? fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t)
              : undefined
          )
          .test(
            'avoid-ip-address',
            t
              ? t('Avoid using the form of an IP address')
              : 'Avoid using the form of an IP address',
            (value: string) => !isValidIP(value)
          ),
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
