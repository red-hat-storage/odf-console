import * as React from 'react';
import { useCustomTranslation } from '@odf/shared';
import { Controller } from 'react-hook-form';
import {
  FileUpload,
  FormGroup,
  FormGroupLabelHelp,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { ScaleSystemFormValidation } from './useFormValidation';

type EncryptionConfigFormProps = {
  certificate: string;
  certificateFileName: string;
  control: ScaleSystemFormValidation['control'];
  fieldRequirements: ScaleSystemFormValidation['fieldRequirements'];
  isDisabled?: boolean;
  onCertificateClear: () => void;
  onCertificateInputChange: (
    event: React.ChangeEvent<HTMLInputElement>,
    file: File
  ) => void;
};

const LabelHelp: React.FC<{ ariaLabel: string; helpText: string }> = ({
  ariaLabel,
  helpText,
}) => (
  <Popover bodyContent={helpText}>
    <FormGroupLabelHelp aria-label={ariaLabel} />
  </Popover>
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
      <FormGroup
        label={t('Username')}
        fieldId="encryptionUserName"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for username field')}
            helpText={t('Example: encryption-user')}
          />
        }
      >
        <Controller
          control={control}
          name="encryptionUserName"
          render={({ field }) => (
            <TextInput
              {...field}
              id="encryptionUserName"
              placeholder={t('Enter username')}
              data-test="encryption-username"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
      <FormGroup
        label={t('Password')}
        fieldId="encryptionPassword"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for password field')}
            helpText={t('Example: mypassword123')}
          />
        }
      >
        <Controller
          control={control}
          name="encryptionPassword"
          render={({ field }) => (
            <TextInput
              {...field}
              id="encryptionPassword"
              type="password"
              placeholder={t('Enter password')}
              data-test="encryption-password"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
      <FormGroup
        label={t('Port')}
        fieldId="encryptionPort"
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for port field')}
            helpText={t('Example: 9443')}
          />
        }
      >
        <Controller
          control={control}
          name="encryptionPort"
          render={({ field }) => (
            <TextInput
              {...field}
              id="encryptionPort"
              placeholder={t('Optional, defaults to 9443')}
              data-test="encryption-port"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
      <FormGroup
        label={t('Client')}
        fieldId="client"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for client field')}
            helpText={t('Example: my-client')}
          />
        }
      >
        <Controller
          control={control}
          name="client"
          render={({ field }) => (
            <TextInput
              {...field}
              id="client"
              placeholder={t('Enter client')}
              data-test="client"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
      <FormGroup
        label={t('Remote RKM')}
        fieldId="remoteRKM"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for remote RKM field')}
            helpText={t('Example: rkm.example.com')}
          />
        }
      >
        <Controller
          control={control}
          name="remoteRKM"
          render={({ field }) => (
            <TextInput
              {...field}
              id="remoteRKM"
              placeholder={t('Enter remote RKM')}
              data-test="remote-rkm"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
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
      <FormGroup
        label={t('Server information')}
        fieldId="serverInformation"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for server information field')}
            helpText={t('Example: server.example.com:9443')}
          />
        }
      >
        <Controller
          control={control}
          name="serverInformation"
          render={({ field }) => (
            <TextInput
              {...field}
              id="serverInformation"
              placeholder={t('Enter server information')}
              data-test="server-information"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
      <FormGroup
        label={t('Tenant ID')}
        fieldId="tenantId"
        isRequired
        labelHelp={
          <LabelHelp
            ariaLabel={t('More info for tenant ID field')}
            helpText={t('Example: tenant-123')}
          />
        }
      >
        <Controller
          control={control}
          name="tenantId"
          render={({ field }) => (
            <TextInput
              {...field}
              id="tenantId"
              placeholder={t('Enter tenant ID')}
              data-test="tenant-id"
              isDisabled={isDisabled}
            />
          )}
        />
      </FormGroup>
    </>
  );
};
