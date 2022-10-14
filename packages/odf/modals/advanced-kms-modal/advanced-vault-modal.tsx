import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { ModalBody, ModalFooter, ModalHeader } from '@odf/shared/modals/Modal';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  TextInput,
  FileUpload,
  Modal,
  ModalVariant,
  Button,
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

const AdvancedVaultModal = (props: AdvancedKMSModalProps) => {
  const {
    closeModal,
    isOpen,
    extraProps: { state, dispatch, isWizardFlow },
  } = props;

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
    'Maximum file size exceeded. File limit is 4MB.'
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
    `The name to use as the SNI host when OpenShift Data Foundation connecting via TLS to the Vault server`
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
      ? (kmsAdvanced.caCert = generateCASecret(caCertificate))
      : (kmsAdvanced.caCert = null);
    clientCertificate && clientCertificate !== ''
      ? (kmsAdvanced.clientCert = generateClientSecret(clientCertificate))
      : (kmsAdvanced.clientCert = null);
    clientKey && clientCertificate !== ''
      ? (kmsAdvanced.clientKey = generateClientKeySecret(clientKey))
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
      isOpen={isOpen}
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
        >
          <TextInput
            value={backendPath}
            onChange={setBackendPath}
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
          >
            <TextInput
              value={authPath}
              onChange={setAuthPath}
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
            >
              <TextInput
                value={authNamespace}
                onChange={setAuthNamespace}
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
          labelIcon={<FieldLevelHelp>{vaultTLSTooltip}</FieldLevelHelp>}
        >
          <TextInput
            value={tlsName}
            onChange={setTLSName}
            type="text"
            id="kms-service-tls"
            name="kms-service-tls"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-service-namespace"
          label={t('Vault Enterprise Namespace')}
          className="ceph-advanced-kms__form-body"
          labelIcon={<FieldLevelHelp>{vaultNamespaceTooltip}</FieldLevelHelp>}
          helperText={t(
            'The name must be accurate and must match the service namespace'
          )}
        >
          <TextInput
            value={providerNS}
            onChange={setProvideNS}
            type="text"
            id="kms-service-namespace"
            name="kms-service-namespace"
            placeholder="kms-namespace"
          />
        </FormGroup>
        <FormGroup
          fieldId="kms-service-ca-cert"
          label={t('CA Certificate')}
          className="ceph-advanced-kms__form-body"
          labelIcon={<FieldLevelHelp>{vaultCACertTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-ca-cert"
            value={caCertificate}
            filename={caCertificateFile}
            onChange={updateCaCert}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            dropzoneProps={{
              accept: '.pem',
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
          labelIcon={<FieldLevelHelp>{vaultClientCertTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-cert"
            value={clientCertificate}
            filename={clientCertificateFile}
            onChange={updateClientCert}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            dropzoneProps={{
              accept: '.pem',
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
          labelIcon={<FieldLevelHelp>{vaultClientKeyTooltip}</FieldLevelHelp>}
        >
          <FileUpload
            id="kms-service-key"
            value={clientKey}
            filename={clientKeyFile}
            onChange={updateClientKey}
            hideDefaultPreview
            filenamePlaceholder={t('Upload a .PEM file here...')}
            dropzoneProps={{
              accept: '.pem',
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
