import * as React from 'react';
import {
  TextInputWithFieldRequirements,
  useCustomTranslation,
} from '@odf/shared';
import { fieldRequirementsTranslations } from '@odf/shared/constants';
import { ValidatedPasswordInput } from '@odf/shared/text-inputs/password-input';
import { TFunction } from 'i18next';
import { Control } from 'react-hook-form';
import * as Yup from 'yup';
import {
  FileUpload,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';

export type ScaleEncryptionFormData = {
  client: string;
  encryptionPassword: string;
  encryptionPort: string;
  encryptionUserName: string;
  remoteRKM: string;
  serverInformation: string;
  tenantId: string;
};

export const scaleEncryptionDefaultValues: ScaleEncryptionFormData = {
  client: '',
  encryptionPassword: '',
  encryptionPort: '',
  encryptionUserName: '',
  remoteRKM: '',
  serverInformation: '',
  tenantId: '',
};

const USERNAME_MAX_LENGTH = 63;
const PORT_MIN = 1;
const PORT_MAX = 65535;
const CLIENT_MAX_LENGTH = 16;
const REMOTE_RKM_MAX_LENGTH = 21;
const SERVER_INFO_MAX_LENGTH = 255;
const TENANT_ID_MAX_LENGTH = 16;

export const isValidHostnameOrIP = (value: string): boolean => {
  const parts = value.split('.');
  const isIPv4 =
    parts.length === 4 &&
    parts.every((part) => {
      const number = Number(part);
      return (
        Number.isInteger(number) &&
        number >= 0 &&
        number <= 255 &&
        String(number) === part
      );
    });
  const hostname =
    /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9](\.[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])*$|^[a-zA-Z]$/;
  return isIPv4 || hostname.test(value);
};

export const getScaleEncryptionValidationFields = (
  t: TFunction,
  required: boolean
) => {
  const cannotBeEmpty = fieldRequirementsTranslations.cannotBeEmpty(t);
  const optional = (schema: Yup.StringSchema) =>
    required
      ? schema.required(cannotBeEmpty)
      : schema
          .optional()
          .transform((value: string) => (!!value ? value : undefined));
  const portRequirement = t('Must be a number between {{min}} and {{max}}', {
    min: PORT_MIN,
    max: PORT_MAX,
  });

  return {
    encryptionUserName: optional(
      Yup.string()
        .max(
          USERNAME_MAX_LENGTH,
          fieldRequirementsTranslations.maxChars(t, USERNAME_MAX_LENGTH)
        )
        .min(1, fieldRequirementsTranslations.minChars(t, 1))
    ),
    encryptionPassword: optional(Yup.string()),
    encryptionPort: optional(
      Yup.string()
        .matches(/^\d+$/, portRequirement)
        .test('port-range', portRequirement, (value) => {
          if (!value) return true;
          const port = Number(value);
          return Number.isInteger(port) && port >= PORT_MIN && port <= PORT_MAX;
        })
    ),
    client: optional(
      Yup.string().max(
        CLIENT_MAX_LENGTH,
        fieldRequirementsTranslations.maxChars(t, CLIENT_MAX_LENGTH)
      )
    ),
    remoteRKM: optional(
      Yup.string()
        .max(
          REMOTE_RKM_MAX_LENGTH,
          fieldRequirementsTranslations.maxChars(t, REMOTE_RKM_MAX_LENGTH)
        )
        .test(
          'valid-hostname-or-ip',
          t('Must be a valid hostname or IP address'),
          (value) => !value || isValidHostnameOrIP(value)
        )
    ),
    serverInformation: optional(
      Yup.string().max(
        SERVER_INFO_MAX_LENGTH,
        fieldRequirementsTranslations.maxChars(t, SERVER_INFO_MAX_LENGTH)
      )
    ),
    tenantId: optional(
      Yup.string().max(
        TENANT_ID_MAX_LENGTH,
        fieldRequirementsTranslations.maxChars(t, TENANT_ID_MAX_LENGTH)
      )
    ),
  };
};

type ScaleEncryptionFormProps = {
  certificate: string;
  control: Control<any>;
  isDisabled?: boolean;
  onCertificateChange: (certificate: string) => void;
};

export const ScaleEncryptionForm: React.FC<ScaleEncryptionFormProps> = ({
  certificate,
  control,
  isDisabled = false,
  onCertificateChange,
}) => {
  const { t } = useCustomTranslation();
  const fieldRequirements = React.useMemo(
    () => ({
      client: [
        fieldRequirementsTranslations.maxChars(t, CLIENT_MAX_LENGTH),
        fieldRequirementsTranslations.cannotBeEmpty(t),
      ],
      password: [fieldRequirementsTranslations.cannotBeEmpty(t)],
      port: [
        t('Must be a number between {{min}} and {{max}}', {
          min: PORT_MIN,
          max: PORT_MAX,
        }),
      ],
      remoteRKM: [
        fieldRequirementsTranslations.maxChars(t, REMOTE_RKM_MAX_LENGTH),
        fieldRequirementsTranslations.minChars(t, 1),
        t('Must be a valid hostname or IP address'),
      ],
      serverInfo: [
        fieldRequirementsTranslations.maxChars(t, SERVER_INFO_MAX_LENGTH),
        fieldRequirementsTranslations.cannotBeEmpty(t),
      ],
      tenantId: [
        fieldRequirementsTranslations.maxChars(t, TENANT_ID_MAX_LENGTH),
        fieldRequirementsTranslations.cannotBeEmpty(t),
      ],
      username: [
        fieldRequirementsTranslations.maxChars(t, USERNAME_MAX_LENGTH),
        fieldRequirementsTranslations.minChars(t, 1),
        fieldRequirementsTranslations.cannotBeEmpty(t),
      ],
    }),
    [t]
  );
  const [certificateFileName, setCertificateFileName] = React.useState('');
  const [certificateReadError, setCertificateReadError] = React.useState('');

  return (
    <>
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.username}
        popoverProps={{
          headerContent: t('Encryption username requirements'),
          footerContent: `${t('Example')}: encryption-user`,
        }}
        formGroupProps={{
          label: t('Username'),
          fieldId: 'encryptionUserName',
          isRequired: true,
        }}
        textInputProps={{
          id: 'encryptionUserName',
          name: 'encryptionUserName',
          type: 'text',
          maxLength: 63,
          placeholder: t('Enter username'),
          'data-test': 'encryption-username',
          isDisabled,
        }}
      />
      <ValidatedPasswordInput
        control={control}
        fieldRequirements={fieldRequirements.password}
        popoverProps={{
          headerContent: t('Encryption password requirements'),
          footerContent: `${t('Example')}: mypassword123`,
        }}
        formGroupProps={{
          label: t('Password'),
          fieldId: 'encryptionPassword',
          isRequired: true,
        }}
        textInputProps={{
          id: 'encryptionPassword',
          name: 'encryptionPassword',
          placeholder: t('Enter password'),
          'data-test': 'encryption-password',
          isDisabled,
        }}
        helperText={t('Password is required')}
      />
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.port}
        popoverProps={{
          headerContent: t('Port requirements'),
          footerContent: `${t('Example')}: 443`,
        }}
        formGroupProps={{
          label: t('Port'),
          fieldId: 'encryptionPort',
          isRequired: true,
        }}
        textInputProps={{
          id: 'encryptionPort',
          name: 'encryptionPort',
          type: 'text',
          maxLength: 5,
          placeholder: t('Enter port'),
          'data-test': 'encryption-port',
          isDisabled,
        }}
      />
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.client}
        popoverProps={{
          headerContent: t('Client requirements'),
          footerContent: `${t('Example')}: my-client`,
        }}
        formGroupProps={{
          label: t('Client'),
          fieldId: 'client',
          isRequired: true,
        }}
        textInputProps={{
          id: 'client',
          name: 'client',
          type: 'text',
          maxLength: 16,
          placeholder: t('Enter client'),
          'data-test': 'client',
          isDisabled,
        }}
      />
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.remoteRKM}
        popoverProps={{
          headerContent: t('Remote RKM requirements'),
          footerContent: `${t('Example')}: rkm.example.com`,
        }}
        formGroupProps={{
          label: t('Remote RKM'),
          fieldId: 'remoteRKM',
          isRequired: true,
        }}
        textInputProps={{
          id: 'remoteRKM',
          name: 'remoteRKM',
          type: 'text',
          maxLength: 21,
          placeholder: t('Enter remote RKM'),
          'data-test': 'remote-rkm',
          isDisabled,
        }}
      />
      <FormGroup label={t('Encryption CA certificate')} isRequired>
        <FileUpload
          placeholder={t('Upload encryption CA certificate')}
          id="file-upload"
          value={certificate}
          filename={certificateFileName}
          isDisabled={isDisabled}
          validated={certificateReadError ? 'error' : 'default'}
          onFileInputChange={(_event, file) => {
            setCertificateFileName(file.name);
            setCertificateReadError('');
            const reader = new FileReader();
            reader.onload = (event) =>
              onCertificateChange(btoa(event.target?.result as string));
            reader.onerror = () =>
              setCertificateReadError(t('Unable to read certificate file'));
            reader.readAsText(file);
          }}
          onClearClick={() => {
            onCertificateChange('');
            setCertificateFileName('');
            setCertificateReadError('');
          }}
        />
        {certificateReadError && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">
                {certificateReadError}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.serverInfo}
        popoverProps={{
          headerContent: t('Server information requirements'),
          footerContent: `${t('Example')}: server.example.com:443`,
        }}
        formGroupProps={{
          label: t('Server information'),
          fieldId: 'serverInformation',
          isRequired: true,
        }}
        textInputProps={{
          id: 'serverInformation',
          name: 'serverInformation',
          type: 'text',
          maxLength: 255,
          placeholder: t('Enter server information'),
          'data-test': 'server-information',
          isDisabled,
        }}
      />
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.tenantId}
        popoverProps={{
          headerContent: t('Tenant ID requirements'),
          footerContent: `${t('Example')}: tenant-123`,
        }}
        formGroupProps={{
          label: t('Tenant ID'),
          fieldId: 'tenantId',
          isRequired: true,
        }}
        textInputProps={{
          id: 'tenantId',
          name: 'tenantId',
          type: 'text',
          maxLength: 16,
          placeholder: t('Enter tenant ID'),
          'data-test': 'tenant-id',
          isDisabled,
        }}
      />
    </>
  );
};
