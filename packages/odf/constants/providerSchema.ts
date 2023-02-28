import * as Yup from 'yup';
import { BC_PROVIDERS } from './mcg';

export const providerSchema = (shouldValidateSecret: boolean) =>
  Yup.object({
    'provider-name': Yup.string().required(),
    endpoint: Yup.string().when('provider-name', {
      is: (value: string) =>
        [BC_PROVIDERS.S3, BC_PROVIDERS.IBM].includes(value as BC_PROVIDERS),
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'aws-region': Yup.string().when('provider-name', {
      is: BC_PROVIDERS.AWS,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    secret: Yup.string().when('provider-name', {
      is: (value: string) =>
        [
          BC_PROVIDERS.AWS,
          BC_PROVIDERS.S3,
          BC_PROVIDERS.AZURE,
          BC_PROVIDERS.IBM,
        ].includes(value as BC_PROVIDERS),
      then: (schema: Yup.StringSchema) =>
        shouldValidateSecret ? schema.required() : schema.notRequired(),
    }),
    'secret-key': Yup.string().when('provider-name', {
      is: BC_PROVIDERS.GCP,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'target-bucket': Yup.string().when('provider-name', {
      is: (value: string) =>
        [
          BC_PROVIDERS.S3,
          BC_PROVIDERS.AWS,
          BC_PROVIDERS.AZURE,
          BC_PROVIDERS.IBM,
          BC_PROVIDERS.GCP,
        ].includes(value as BC_PROVIDERS),
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'pvc-name': Yup.string().when('provider-name', {
      is: BC_PROVIDERS.FILESYSTEM,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
    'folder-name': Yup.string().when('provider-name', {
      is: BC_PROVIDERS.FILESYSTEM,
      then: (schema: Yup.StringSchema) => schema.required(),
    }),
  });
