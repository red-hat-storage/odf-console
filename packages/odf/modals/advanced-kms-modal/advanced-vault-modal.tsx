import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import {
  FormGroup,
  TextInput,
  FileUpload,
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { AdvancedKMSModalProps } from '../../components/kms-config/providers';
import {
  generateCASecret,
  generateClientSecret,
  generateClientKeySecret,
} from '../../components/kms-config/utils';
import { KMSMaxFileUploadSize } from '../../constants';
import { VaultConfig, VaultAuthMethods } from '../../types';
import './advanced-kms-modal.scss';

const AdvancedVaultModal: ModalComponent<AdvancedKMSModalProps> = (props) => {
  const { closeModal, state, dispatch, isWizardFlow, systemNamespace } = props;

  const kms = state.kms.providerState as VaultConfig;

  const { t } = useCustomTranslation();

  const [backendPath, setBackendPath] = React.useState(kms?.backend || '');
  const [authPath, setAuthPath] = React.useState(kms?.providerAuthPath || '');
  const [authNamespace, setAuthNamespace] = React.useState(
    kms?.providerAuthNamespace || ''
  );

  const [tlsName, setTLSName] = React.useState(kms?.tls || '');
  const [caCertificate, setCACertificate] = React.useState(
    kms?.caCert?.stringData['ca.cert'] || ''
  );
  const [caCertificateFile, setCACertificateFile] = React.useState(
    kms?.caCertFile || ''
  );
  const [clientCertificate, setClientCertificate] = React.useState(
    kms?.clientCert?.stringData['tls.cert'] || ''
  );
  const [clientCertificateFile, setClientCertificateFile] = React.useState(
    kms?.clientCertFile || ''
  );
  const [clientKey, setClientKey] = React.useState(
    kms?.clientCert?.stringData['tls.key'] || ''
  );
  const [clientKeyFile, setClientKeyFile] = React.useState(
    kms?.clientKeyFile || ''
  );
  const [providerNS, setProvideNS] = React.useState(
    kms?.providerNamespace || ''
  );
  const [error, setError] = React.useState('');

  const vaultNamespaceTooltip = t(
    'Vault enterprise namespaces are isolated environments that functionally exist as Vaults within a Vault. They have separate login paths and support creating and managing data isolated to their namespace.'
  );

  const KMSFileSizeErrorMsg = t(
    'Invalid file: File size exceeds 4MB limit or incorrect file extension (only .pem files allowed).'
  );

  const vaultCACertTooltip = t(
    `A PEM-encoded CA certificate file used to verify the Vault server's SSL certificate.`
  );

  const vaultClientCertTooltip = t(
    `A PEM-encoded client certificate. This certificate is used for TLS communication with the Vault server.`
  );

  const vaultClientKeyTooltip = t(
    `An unencrypted, PEM-encoded private key which corresponds to the matching client certificate provided with VAULT_CLIENT_CERT.`
  );

  const vaultTLSTooltip = t(
    `The name to use as the SNI host when Data Foundation connecting via TLS to the Vault server.`
  );

  const vaultAuthNamespace = t(
    `The Vault namespace where kubernetes auth method is enabled.`
  );

  const vaultAuthPath = t(
    `The path where kubernetes auth method is enabled in Vault. The default path is kubernetes. If the auth method is enabled in a different path other than kubernetes, this variable needs to be set as "/v1/auth/<path>/login".`
  );

  const vaultBackendPath = t(
    `The backend path in Vault where the encryption keys will be stored.`
  );

  const submit = (event: React.FormEvent<EventTarget>) => {
    event.preventDefault();

    const kmsAdvanced = {
      ...kms,
      backend: backendPath,
      providerAuthNamespace: authNamespace,
      providerAuthPath: authPath,
      tls: tlsName,
      providerNamespace: providerNS,
      caCertFile: caCertificateFile,
      clientCertFile: clientCertificateFile,
      clientKeyFile,
    };

    caCertificate && caCertificate !== ''
      ? (kmsAdvanced.caCert = generateCASecret(caCertificate, systemNamespace))
      : (kmsAdvanced.caCert = null);
    clientCertificate && clientCertificate !== ''
      ? (kmsAdvanced.clientCert = generateClientSecret(
          clientCertificate,
          systemNamespace
        ))
      : (kmsAdvanced.clientCert = null);
    clientKey && clientCertificate !== ''
      ? (kmsAdvanced.clientKey = generateClientKeySecret(
          clientKey,
          systemNamespace
        ))
      : (kmsAdvanced.clientKey = null);

    dispatch({
      type: 'securityAndNetwork/setKmsProviderState',
      payload: kmsAdvanced,
    });
    closeModal();
  };

  const readFile = (file: File, fn: Function, fileFn: Function) => {
    const reader = new FileReader();
    reader.onload = () => {
      const input = reader.result;
      fn(input.toString());
    };
    if (file) {
      reader.readAsText(file, 'UTF-8');
    } else {
      fn('');
      fileFn('');
    }
  };

  const updateCaCert = (value: File, filename: string) => {
    readFile(value, setCACertificate, setCACertificateFile);
    setCACertificateFile(filename);
  };

  const updateClientCert = (value: File, filename: string) => {
    readFile(value, setClientCertificate, setClientCertificateFile);
    setClientCertificateFile(filename);
  };

  const updateClientKey = (value: File, filename: string) => {
    readFile(value, setClientKey, setClientKeyFile);
    setClientKeyFile(filename);
  };

  const Header = (
    <ModalHeader>{t('Key Management Service Advanced Settings')}</ModalHeader>
  );
  return (
    <Modal
      header={Header}
      isOpen
      onClose={closeModal}
      showClose={false}
      hasNoBodyWrapper={true}
      variant={ModalVariant.small}
      className="modal-content modal-content"
    >
      <ModalBody>
        <FormGroup
          fieldId="kms-service-backend-path"
          label={t('Backend Path')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultBackendPath}</FieldLevelHelp>}
        >
          <TextInput
            value={backendPath}
            onChange={(_ev, value) => setBackendPath(value)}
            type="text"
            id="kms-service-backend-path"
            name="kms-service-backend-path"
            placeholder={t('path/')}
            data-test="kms-service-backend-path"
          />
        </FormGroup>
        {kms.authMethod === VaultAuthMethods.KUBERNETES && (
          <FormGroup
            fieldId="kms-auth-path"
            label={t('Authentication Path')}
            className="ceph-advanced-kms__form-body"
            labelHelp={<FieldLevelHelp>{vaultAuthPath}</FieldLevelHelp>}
          >
            <TextInput
              value={authPath}
              onChange={(_ev, value) => setAuthPath(value)}
              type="text"
              id="kms-service-auth-path"
              name="kms-service-auth-path"
              data-test="kms-service-auth-path"
            />
          </FormGroup>
        )}

        {kms.authMethod === VaultAuthMethods.KUBERNETES &&
          state.encryption.storageClass &&
          !isWizardFlow && (
            <FormGroup
              fieldId="kms-auth-namespace"
              label={t('Authentication Namespace')}
              className="ceph-advanced-kms__form-body"
              labelHelp={<FieldLevelHelp>{vaultAuthNamespace}</FieldLevelHelp>}
            >
              <TextInput
                value={authNamespace}
                onChange={(_ev, value) => setAuthNamespace(value)}
                type="text"
                id="kms-service-auth-namespace"
                name="kms-service-auth-namespace"
                data-test="kms-service-auth-namespace"
              />
            </FormGroup>
          )}

        <FormGroup
          fieldId="kms-service-tls"
          label={t('TLS Server Name')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultTLSTooltip}</FieldLevelHelp>}
        >
          <TextInput
            value={tlsName}
            onChange={(_ev, value) => setTLSName(value)}
            type="text"
            id="kms-service-tls"
            name="kms-service-tls"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-service-namespace"
          label={t('Vault Enterprise Namespace')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultNamespaceTooltip}</FieldLevelHelp>}
        >
          <TextInput
            value={providerNS}
            onChange={(_ev, value) => setProvideNS(value)}
            type="text"
            id="kms-service-namespace"
            name="kms-service-namespace"
            placeholder="kms-namespace"
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t(
                  'The name must be accurate and must match the service namespace'
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
        <FormGroup
          fieldId="kms-service-ca-cert"
          label={t('CA Certificate')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultCACertTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-ca-cert"
            value={caCertificate}
            filename={caCertificateFile}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            onFileInputChange={(_ev, file) => updateCaCert(file, file.name)}
            dropzoneProps={{
              accept: { 'text/plain': ['.pem'] },
              maxSize: KMSMaxFileUploadSize,
              onDropRejected: () => setError(KMSFileSizeErrorMsg),
            }}
            data-test="kms-service-ca-cert"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-service-cert"
          label={t('Client Certificate')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultClientCertTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-cert"
            value={clientCertificate}
            filename={clientCertificateFile}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            onFileInputChange={(_ev, file) => updateClientCert(file, file.name)}
            dropzoneProps={{
              accept: { 'text/plain': ['.pem'] },
              maxSize: KMSMaxFileUploadSize,
              onDropRejected: () => setError(KMSFileSizeErrorMsg),
            }}
            data-test="kms-service-client-cert"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-service-key"
          label={t('Client Private Key')}
          className="ceph-advanced-kms__form-body"
          labelHelp={<FieldLevelHelp>{vaultClientKeyTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-key"
            value={clientKey}
            filename={clientKeyFile}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            onFileInputChange={(_ev, file) => updateClientKey(file, file.name)}
            dropzoneProps={{
              accept: { 'text/plain': ['.pem'] },
              maxSize: KMSMaxFileUploadSize,
              onDropRejected: () => setError(KMSFileSizeErrorMsg),
            }}
            data-test="kms-service-client-private-key"
          />
        </FormGroup>
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="secondary" onClick={closeModal}>
          {t('Cancel')}
        </Button>
        <Button
          key="Save"
          variant="primary"
          data-test="save-kms-action"
          onClick={submit}
          isDisabled={!!error}
        >
          {t('Save')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AdvancedVaultModal;
