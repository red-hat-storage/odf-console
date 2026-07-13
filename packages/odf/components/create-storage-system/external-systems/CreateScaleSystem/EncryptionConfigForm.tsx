import * as React from 'react';
import {
  TextInputWithFieldRequirements,
  useCustomTranslation,
} from '@odf/shared';
import { ValidatedPasswordInput } from '@odf/shared/text-inputs/password-input';
import { FileUpload, FormGroup } from '@patternfly/react-core';
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

export const EncryptionConfigForm: React.FC<EncryptionConfigFormProps> = ({
  certificate,
  certificateFileName,
  control,
  fieldRequirements,
  isDisabled = false,
  onCertificateClear,
  onCertificateInputChange,
}) => {
  const { t } = useCustomTranslation();

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
          footerContent: `${t('Example')}: 9443`,
        }}
        formGroupProps={{
          label: t('Port'),
          fieldId: 'encryptionPort',
        }}
        textInputProps={{
          id: 'encryptionPort',
          name: 'encryptionPort',
          type: 'text',
          placeholder: t('Optional, defaults to 9443'),
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
          placeholder: t('Enter client'),
          'data-test': 'client',
          isDisabled,
        }}
      />
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.hostname}
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
          placeholder: t('Enter remote RKM'),
          'data-test': 'remote-rkm',
          isDisabled,
        }}
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
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements.serverInfo}
        popoverProps={{
          headerContent: t('Server information requirements'),
          footerContent: `${t('Example')}: server.example.com:9443`,
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
          placeholder: t('Enter tenant ID'),
          'data-test': 'tenant-id',
          isDisabled,
        }}
      />
    </>
  );
};
