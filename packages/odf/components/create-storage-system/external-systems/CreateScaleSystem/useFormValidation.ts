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
const HOSTNAME_MAX_LENGTH = 253;
const HOSTNAME_MIN_LENGTH = 1;
const USERNAME_MAX_LENGTH = 63;
const USERNAME_MIN_LENGTH = 1;
const PORT_MIN = 1;
const PORT_MAX = 65535;
const TENANT_ID_MAX_LENGTH = 63;
const CLIENT_MAX_LENGTH = 63;
const SERVER_INFO_MAX_LENGTH = 255;

export type ScaleSystemFormSchema = Yup.ObjectSchema<{
  name: Yup.StringSchema;
  'mandatory-endpoint-host': Yup.StringSchema;
  'mandatory-endpoint-port': Yup.StringSchema;
  'optional-endpoint-1-host': Yup.StringSchema;
  'optional-endpoint-1-port': Yup.StringSchema;
  'optional-endpoint-2-host': Yup.StringSchema;
  'optional-endpoint-2-port': Yup.StringSchema;
  userName: Yup.StringSchema;
  password: Yup.StringSchema;
  fileSystemName: Yup.StringSchema;
  encryptionUserName: Yup.StringSchema;
  encryptionPassword: Yup.StringSchema;
  encryptionPort: Yup.StringSchema;
  client: Yup.StringSchema;
  remoteRKM: Yup.StringSchema;
  serverInformation: Yup.StringSchema;
  tenantId: Yup.StringSchema;
}>;

export type ScaleSystemFormData = {
  name: string;
  'mandatory-endpoint-host': string;
  'mandatory-endpoint-port': string;
  'optional-endpoint-1-host': string;
  'optional-endpoint-1-port': string;
  'optional-endpoint-2-host': string;
  'optional-endpoint-2-port': string;
  userName: string;
  password: string;
  fileSystemName: string;
  encryptionUserName: string;
  encryptionPassword: string;
  encryptionPort: string;
  client: string;
  remoteRKM: string;
  serverInformation: string;
  tenantId: string;
};

export type ScaleSystemFormValidation = {
  formSchema: ScaleSystemFormSchema;
  fieldRequirements: {
    name: string[];
    hostname: string[];
    port: string[];
    username: string[];
    password: string[];
    fileSystemName: string[];
    tenantId: string[];
    client: string[];
    serverInfo: string[];
  };
  control: any;
  handleSubmit: any;
  formState: { isSubmitted: boolean };
  watch: any;
  getValues: any;
};

const useScaleSystemFormValidation = (): ScaleSystemFormValidation => {
  const { t } = useCustomTranslation();

  const { formSchema, fieldRequirements } = React.useMemo(() => {
    // System name validation (similar to bucket name)
    const nameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, SYSTEM_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, SYSTEM_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    ];

    // Hostname validation
    const hostnameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, HOSTNAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, HOSTNAME_MIN_LENGTH),
      t('Must be a valid hostname or IP address'),
    ];

    // IP address validation function (supports IPv4)
    const isValidIPv4 = (value: string) => {
      const parts = value.split('.');
      if (parts.length !== 4) return false;
      return parts.every((part) => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
      });
    };

    // Hostname validation regex (supports valid hostnames, but not pure numeric strings)
    const hostnameRegex =
      /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9](\.[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])*$|^[a-zA-Z]$/;

    // Combined validation function
    const isValidHostnameOrIP = (value: string) => {
      // First check if it's a valid IPv4
      if (isValidIPv4(value)) return true;

      // Then check if it's a valid hostname (must contain at least one letter)
      if (/[a-zA-Z]/.test(value) && hostnameRegex.test(value)) return true;

      return false;
    };

    // Port validation
    const portFieldRequirements = [
      t(`Must be a number between ${PORT_MIN} and ${PORT_MAX}`),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    // Username validation
    const usernameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, USERNAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, USERNAME_MIN_LENGTH),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    // Password validation - only check that it's not empty
    const passwordFieldRequirements = [
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    // File system name validation (similar to system name)
    const fileSystemNameFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, SYSTEM_NAME_MAX_LENGTH),
      fieldRequirementsTranslations.minChars(t, SYSTEM_NAME_MIN_LENGTH),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    ];

    // Tenant ID validation
    const tenantIdFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, TENANT_ID_MAX_LENGTH),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    // Client validation
    const clientFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, CLIENT_MAX_LENGTH),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    // Server information validation
    const serverInfoFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, SERVER_INFO_MAX_LENGTH),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];

    const formSchema = Yup.object({
      name: Yup.string()
        .required(t('System name is required'))
        .max(SYSTEM_NAME_MAX_LENGTH, nameFieldRequirements[0])
        .min(SYSTEM_NAME_MIN_LENGTH, nameFieldRequirements[1])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          nameFieldRequirements[2]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          nameFieldRequirements[3]
        )
        .transform((value: string) => (!!value ? value : '')),

      'mandatory-endpoint-host': Yup.string()
        .required(t('Mandatory endpoint host is required'))
        .max(HOSTNAME_MAX_LENGTH, hostnameFieldRequirements[0])
        .min(HOSTNAME_MIN_LENGTH, hostnameFieldRequirements[1])
        .test(
          'valid-hostname-or-ip',
          hostnameFieldRequirements[2],
          isValidHostnameOrIP
        ),

      'mandatory-endpoint-port': Yup.string()
        .required(t('Mandatory endpoint port is required'))
        .matches(/^\d+$/, portFieldRequirements[0])
        .test('port-range', portFieldRequirements[0], (value) => {
          const port = parseInt(value, 10);
          return port >= PORT_MIN && port <= PORT_MAX;
        }),

      'optional-endpoint-1-host': Yup.string()
        .optional()
        .max(HOSTNAME_MAX_LENGTH, hostnameFieldRequirements[0])
        .min(HOSTNAME_MIN_LENGTH, hostnameFieldRequirements[1])
        .test('valid-hostname-or-ip', hostnameFieldRequirements[2], (value) => {
          if (!value) return true;
          return isValidHostnameOrIP(value);
        })
        .transform((value: string) => (!!value ? value : undefined)),

      'optional-endpoint-1-port': Yup.string()
        .optional()
        .matches(/^\d+$/, portFieldRequirements[0])
        .test('port-range', portFieldRequirements[0], (value) => {
          if (!value) return true;
          const port = parseInt(value, 10);
          return port >= PORT_MIN && port <= PORT_MAX;
        })
        .transform((value: string) => (!!value ? value : undefined)),

      'optional-endpoint-2-host': Yup.string()
        .optional()
        .max(HOSTNAME_MAX_LENGTH, hostnameFieldRequirements[0])
        .min(HOSTNAME_MIN_LENGTH, hostnameFieldRequirements[1])
        .test('valid-hostname-or-ip', hostnameFieldRequirements[2], (value) => {
          if (!value) return true;
          return isValidHostnameOrIP(value);
        })
        .transform((value: string) => (!!value ? value : undefined)),

      'optional-endpoint-2-port': Yup.string()
        .optional()
        .matches(/^\d+$/, portFieldRequirements[0])
        .test('port-range', portFieldRequirements[0], (value) => {
          if (!value) return true;
          const port = parseInt(value, 10);
          return port >= PORT_MIN && port <= PORT_MAX;
        })
        .transform((value: string) => (!!value ? value : undefined)),

      userName: Yup.string()
        .required(t('Username is required'))
        .max(USERNAME_MAX_LENGTH, usernameFieldRequirements[0])
        .min(USERNAME_MIN_LENGTH, usernameFieldRequirements[1]),

      password: Yup.string().required(t('Password is required')),

      fileSystemName: Yup.string()
        .required(t('File system name is required'))
        .max(SYSTEM_NAME_MAX_LENGTH, fileSystemNameFieldRequirements[0])
        .min(SYSTEM_NAME_MIN_LENGTH, fileSystemNameFieldRequirements[1])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fileSystemNameFieldRequirements[2]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fileSystemNameFieldRequirements[3]
        )
        .transform((value: string) => (!!value ? value : '')),

      encryptionUserName: Yup.string()
        .optional()
        .max(USERNAME_MAX_LENGTH, usernameFieldRequirements[0])
        .min(USERNAME_MIN_LENGTH, usernameFieldRequirements[1])
        .transform((value: string) => (!!value ? value : undefined)),

      encryptionPassword: Yup.string()
        .optional()
        .transform((value: string) => (!!value ? value : undefined)),

      encryptionPort: Yup.string()
        .optional()
        .matches(/^\d+$/, portFieldRequirements[0])
        .test('port-range', portFieldRequirements[0], (value) => {
          if (!value) return true;
          const port = parseInt(value, 10);
          return port >= PORT_MIN && port <= PORT_MAX;
        })
        .transform((value: string) => (!!value ? value : undefined)),

      client: Yup.string()
        .optional()
        .max(CLIENT_MAX_LENGTH, clientFieldRequirements[0])
        .transform((value: string) => (!!value ? value : undefined)),

      remoteRKM: Yup.string()
        .optional()
        .max(HOSTNAME_MAX_LENGTH, hostnameFieldRequirements[0])
        .min(HOSTNAME_MIN_LENGTH, hostnameFieldRequirements[1])
        .test('valid-hostname-or-ip', hostnameFieldRequirements[2], (value) => {
          if (!value) return true;
          return isValidHostnameOrIP(value);
        })
        .transform((value: string) => (!!value ? value : undefined)),

      serverInformation: Yup.string()
        .optional()
        .max(SERVER_INFO_MAX_LENGTH, serverInfoFieldRequirements[0])
        .transform((value: string) => (!!value ? value : undefined)),

      tenantId: Yup.string()
        .optional()
        .max(TENANT_ID_MAX_LENGTH, tenantIdFieldRequirements[0])
        .transform((value: string) => (!!value ? value : undefined)),
    });

    return {
      formSchema: formSchema as unknown as ScaleSystemFormSchema,
      fieldRequirements: {
        name: nameFieldRequirements,
        hostname: hostnameFieldRequirements,
        port: portFieldRequirements,
        username: usernameFieldRequirements,
        password: passwordFieldRequirements,
        fileSystemName: fileSystemNameFieldRequirements,
        tenantId: tenantIdFieldRequirements,
        client: clientFieldRequirements,
        serverInfo: serverInfoFieldRequirements,
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
      name: '',
      'mandatory-endpoint-host': '',
      'mandatory-endpoint-port': '',
      'optional-endpoint-1-host': '',
      'optional-endpoint-1-port': '',
      'optional-endpoint-2-host': '',
      'optional-endpoint-2-port': '',
      userName: '',
      password: '',
      fileSystemName: '',
      encryptionUserName: '',
      encryptionPassword: '',
      encryptionPort: '',
      client: '',
      remoteRKM: '',
      serverInformation: '',
      tenantId: '',
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

export default useScaleSystemFormValidation;
