import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Control, Controller, FieldValues } from 'react-hook-form';
import {
  FileUpload,
  FormGroup,
  FormGroupLabelHelp,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
  TextInputProps,
} from '@patternfly/react-core';
import { EncryptionFormData } from './useEncryptionFormValidation';

type EncryptionConfigFormProps = {
  certificate: string;
  certificateFileName: string;
  control: Control<FieldValues>;
  isDisabled?: boolean;
  onCertificateClear: () => void;
  onCertificateInputChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    file: File
  ) => void;
};

type EncryptionTextFieldProps = {
  ariaLabel: string;
  control: Control<FieldValues>;
  dataTest: string;
  helpText: string;
  isDisabled: boolean;
  label: string;
  name: keyof EncryptionFormData;
  placeholder: string;
  type?: TextInputProps['type'];
};

const EncryptionTextField: React.FC<EncryptionTextFieldProps> = ({
  ariaLabel,
  control,
  dataTest,
  helpText,
  isDisabled,
  label,
  name,
  placeholder,
  type = 'text',
}) => (
  <FormGroup
    label={label}
    fieldId={name}
    isRequired={name !== 'encryptionPort'}
    labelHelp={
      <Popover bodyContent={helpText}>
        <FormGroupLabelHelp aria-label={ariaLabel} />
      </Popover>
    }
  >
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState: { error } }) => (
        <>
          <TextInput
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            data-test={dataTest}
            isDisabled={isDisabled}
            validated={error ? 'error' : 'default'}
          />
          {error && (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{error.message}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          )}
        </>
      )}
    />
  </FormGroup>
);

export const EncryptionConfigForm: React.FC<EncryptionConfigFormProps> = ({
  certificate,
  certificateFileName,
  control,
  isDisabled = false,
  onCertificateClear,
  onCertificateInputChange,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <EncryptionTextField
        ariaLabel={t('More info for username field')}
        control={control}
        dataTest="encryption-username"
        helpText={t('Example: encryption-user')}
        isDisabled={isDisabled}
        label={t('Username')}
        name="encryptionUserName"
        placeholder={t('Enter username')}
      />
      <EncryptionTextField
        ariaLabel={t('More info for password field')}
        control={control}
        dataTest="encryption-password"
        helpText={t('Example: mypassword123')}
        isDisabled={isDisabled}
        label={t('Password')}
        name="encryptionPassword"
        placeholder={t('Enter password')}
        type="password"
      />
      <EncryptionTextField
        ariaLabel={t('More info for port field')}
        control={control}
        dataTest="encryption-port"
        helpText={t('Example: 9443')}
        isDisabled={isDisabled}
        label={t('Port')}
        name="encryptionPort"
        placeholder={t('Optional, defaults to 9443')}
      />
      <EncryptionTextField
        ariaLabel={t('More info for client field')}
        control={control}
        dataTest="client"
        helpText={t('Example: my-client')}
        isDisabled={isDisabled}
        label={t('Client')}
        name="client"
        placeholder={t('Enter client')}
      />
      <EncryptionTextField
        ariaLabel={t('More info for remote RKM field')}
        control={control}
        dataTest="remote-rkm"
        helpText={t('Example: rkm.example.com')}
        isDisabled={isDisabled}
        label={t('Remote RKM')}
        name="remoteRKM"
        placeholder={t('Enter remote RKM')}
      />
      <FormGroup label={t('Encryption CA certificate')}>
        <FileUpload
          placeholder={t('Upload encryption CA certificate')}
          id="encryption-ca-file-upload"
          value={certificate}
          filename={certificateFileName}
          onFileInputChange={onCertificateInputChange}
          onClearClick={onCertificateClear}
          isDisabled={isDisabled}
        />
      </FormGroup>
      <EncryptionTextField
        ariaLabel={t('More info for server information field')}
        control={control}
        dataTest="server-information"
        helpText={t('Example: server.example.com:9443')}
        isDisabled={isDisabled}
        label={t('Server information')}
        name="serverInformation"
        placeholder={t('Enter server information')}
      />
      <EncryptionTextField
        ariaLabel={t('More info for tenant ID field')}
        control={control}
        dataTest="tenant-id"
        helpText={t('Example: tenant-123')}
        isDisabled={isDisabled}
        label={t('Tenant ID')}
        name="tenantId"
        placeholder={t('Enter tenant ID')}
      />
    </>
  );
};
