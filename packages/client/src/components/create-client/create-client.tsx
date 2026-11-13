import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { useODFNamespaceSelector } from '@odf/core/redux';
import {
  ButtonBar,
  emptyTextFileValue,
  TextFileUpload,
  TextFileValue,
  useCustomTranslation,
} from '@odf/shared';
import { StorageClientModel } from '@odf/shared/models';
import { ConfigMapModel, SecretModel } from '@odf/shared/models/common';
import { getName } from '@odf/shared/selectors/k8s';
import { ConfigMapKind, SecretKind } from '@odf/shared/types/k8s';
import { StorageClient } from '@odf/shared/types/storage';
import { getResourceName } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
} from '@openshift-console/dynamic-plugin-sdk';
import { isIP } from 'is-ip';
import * as _ from 'lodash-es';
import { useNavigate, useParams } from 'react-router';
import {
  Form,
  Button,
  FormGroup,
  TextInput,
  TextArea,
  Content,
  ContentVariants,
  ActionGroup,
  ValidatedOptions,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Title,
} from '@patternfly/react-core';
import {
  AUTH_MAX_FILE_SIZE,
  CERTIFICATE_EXTENSIONS,
  CERTIFICATE_PLACEHOLDER,
  CLIENT_CERT_DATA_KEY,
  CLIENT_KEY_DATA_KEY,
  KEY_EXTENSIONS,
  PRIVATE_KEY_PLACEHOLDER,
  SERVER_CA_DATA_KEY,
  TLS_SECRET_TYPE,
} from '../../constants';
import './create-client.scss';
import '../../../style.scss';

const CreateStorageClientHeader: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <div className="odf-create-storage-client__header">
      <Content>
        <Content component={ContentVariants.h1}>
          {t('Create StorageClient')}
        </Content>
        <Content component={ContentVariants.small}>
          {t('Create a StorageClient to connect to a Data Foundation system.')}
        </Content>
      </Content>
    </div>
  );
};

const validateURL = (userInput: string): ValidatedOptions => {
  if (!userInput) {
    return ValidatedOptions.default;
  }
  try {
    let port: string = '';
    let address: string = '';
    const splitInput = userInput.split(':');
    if (splitInput.length > 3) {
      return ValidatedOptions.error;
    }
    if (splitInput.length === 3) {
      address = splitInput[0] + splitInput[1];
      port = splitInput[2];
    }
    if (splitInput.length === 2) {
      address = splitInput[0];
      port = splitInput[1];
    }
    const isPortValid = port !== '' && _.isInteger(Number(port));
    if (isIP(address) && isPortValid) {
      return ValidatedOptions.success;
    }
    (() => new URL(userInput))();
    if (isPortValid) {
      return ValidatedOptions.success;
    }
  } catch {
    return ValidatedOptions.error;
  }
};

const CreateStorageClient: React.FC = () => {
  const [name, setName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [ticket, setTicket] = React.useState('');
  const [serverCA, setServerCA] =
    React.useState<TextFileValue>(emptyTextFileValue);
  const [clientCert, setClientCert] =
    React.useState<TextFileValue>(emptyTextFileValue);
  const [clientKey, setClientKey] =
    React.useState<TextFileValue>(emptyTextFileValue);
  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const { plural } = useParams();
  const { odfNamespace } = useODFNamespaceSelector();
  const redirectionUrl = `/k8s/cluster/${plural}/${name}`;

  const hasServerCA = !!serverCA.value.trim();
  const hasClientCert = !!clientCert.value.trim();
  const hasClientKey = !!clientKey.value.trim();
  const missingRequiredField =
    !name.trim() ||
    !address.trim() ||
    !ticket.trim() ||
    !hasServerCA ||
    !hasClientCert ||
    !hasClientKey;
  const textTooLargeMessage = t('Text exceeds the 1MB limit.');
  const isCreateDisabled =
    inProgress ||
    missingRequiredField ||
    !!serverCA.error ||
    !!clientCert.error ||
    !!clientKey.error;

  const serverCAHelp = t('Paste the server CA or upload a .crt or .pem file.');
  const certificateHelp = t(
    'Paste the client certificate or upload a .crt or .pem file.'
  );
  const keyHelp = t('Paste the client key or upload a .key file.');
  const invalidCertificateMessage = t(
    'Invalid file: Incorrect file extension (only .crt and .pem files allowed).'
  );
  const invalidKeyMessage = t(
    'Invalid file: Incorrect file extension (only .key files allowed).'
  );
  const submit = async () => {
    if (
      inProgress ||
      missingRequiredField ||
      serverCA.error ||
      clientCert.error ||
      clientKey.error
    ) {
      return;
    }
    setProgress(true);

    const serverCAValue = serverCA.value.trim();
    const certificateValue = clientCert.value.trim();
    const keyValue = clientKey.value.trim();

    let createdServerCA: ConfigMapKind | undefined;
    let createdClientCert: SecretKind | undefined;
    try {
      if (serverCAValue) {
        const serverCAName = getResourceName(name, 'server-ca');
        createdServerCA = await k8sCreate<ConfigMapKind>({
          model: ConfigMapModel,
          data: {
            apiVersion: ConfigMapModel.apiVersion,
            kind: ConfigMapModel.kind,
            metadata: {
              name: serverCAName,
              namespace: odfNamespace,
            },
            data: { [SERVER_CA_DATA_KEY]: serverCAValue },
          },
        });
      }
      if (certificateValue && keyValue) {
        const clientCertName = getResourceName(name, 'client-cert');
        createdClientCert = await k8sCreate<SecretKind>({
          model: SecretModel,
          data: {
            apiVersion: SecretModel.apiVersion,
            kind: SecretModel.kind,
            metadata: {
              name: clientCertName,
              namespace: odfNamespace,
            },
            type: TLS_SECRET_TYPE,
            stringData: {
              [CLIENT_CERT_DATA_KEY]: certificateValue,
              [CLIENT_KEY_DATA_KEY]: keyValue,
            },
          },
        });
      }
      await k8sCreate<StorageClient>({
        model: StorageClientModel,
        data: {
          apiVersion: getAPIVersionForModel(StorageClientModel),
          kind: StorageClientModel.kind,
          metadata: {
            name,
          },
          spec: {
            storageProviderEndpoint: address,
            onboardingTicket: ticket,
            ...(createdServerCA
              ? {
                  serverCAConfigMap: {
                    name: getName(createdServerCA),
                    key: SERVER_CA_DATA_KEY,
                  },
                }
              : {}),
            ...(createdClientCert
              ? {
                  clientCertSecret: {
                    name: getName(createdClientCert),
                  },
                }
              : {}),
          },
        },
      });
      setProgress(false);
      navigate(redirectionUrl);
    } catch (err) {
      if (createdServerCA) {
        k8sDelete({
          model: ConfigMapModel,
          resource: createdServerCA,
        }).catch(() => undefined);
      }
      if (createdClientCert) {
        k8sDelete({
          model: SecretModel,
          resource: createdClientCert,
        }).catch(() => undefined);
      }
      setProgress(false);
      setError(err);
    }
  };

  return (
    <NamespaceSafetyBox>
      <div>
        <CreateStorageClientHeader />
        <div className="odf-m-pane__body">
          <Form className="odf-create-client__form">
            <FormGroup label={t('Name')} fieldId="name" isRequired>
              <TextInput
                id="name"
                value={name}
                onChange={(_e, value) => setName(value)}
              />
            </FormGroup>
            <FormGroup
              label={t('Data Foundation endpoint')}
              fieldId="address"
              isRequired
            >
              <TextInput
                id="address"
                type="url"
                value={address}
                onChange={(_e, value) => setAddress(value)}
                validated={validateURL(address)}
              />
              {validateURL(address) === ValidatedOptions.error && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant={ValidatedOptions.error}>
                      {t('Please provide a proper URL with a valid port.')}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>
            <FormGroup
              label={t('Onboarding token')}
              fieldId="ticket-data"
              isRequired
            >
              <TextArea
                id="ticket-data"
                value={ticket}
                onChange={(_e, value) => setTicket(value)}
              />
            </FormGroup>
            <div>
              <Title headingLevel="h2" size="md" className="pf-v6-u-mb-xs">
                {t('Authentication')}
              </Title>
              <Content component={ContentVariants.small}>
                {t(
                  'Provide details for mutual TLS (mTLS) communication with the Data Foundation system.'
                )}
              </Content>
            </div>
            <TextFileUpload
              id="server-ca"
              label={t('Server CA')}
              helpText={serverCAHelp}
              popover={t(
                'The certificate authority (CA) that signed the server certificate of the Data Foundation system. This client uses it to confirm that it connects to the right system.'
              )}
              extensions={CERTIFICATE_EXTENSIONS}
              invalidFileMessage={invalidCertificateMessage}
              tooLargeMessage={textTooLargeMessage}
              maxFileSize={AUTH_MAX_FILE_SIZE}
              textAreaPlaceholder={CERTIFICATE_PLACEHOLDER}
              file={serverCA}
              onChange={setServerCA}
            />
            <TextFileUpload
              id="client-certificate-upload"
              label={t('Client certificate')}
              helpText={certificateHelp}
              popover={t(
                'The certificate that identifies this client to the Data Foundation system. The system checks it against the client CA and the SAN set on the matching storage consumer.'
              )}
              extensions={CERTIFICATE_EXTENSIONS}
              invalidFileMessage={invalidCertificateMessage}
              tooLargeMessage={textTooLargeMessage}
              maxFileSize={AUTH_MAX_FILE_SIZE}
              textAreaPlaceholder={CERTIFICATE_PLACEHOLDER}
              file={clientCert}
              onChange={setClientCert}
            />
            <TextFileUpload
              id="client-key-upload"
              label={t('Client key')}
              helpText={keyHelp}
              extensions={KEY_EXTENSIONS}
              invalidFileMessage={invalidKeyMessage}
              tooLargeMessage={textTooLargeMessage}
              maxFileSize={AUTH_MAX_FILE_SIZE}
              textAreaPlaceholder={PRIVATE_KEY_PLACEHOLDER}
              file={clientKey}
              onChange={setClientKey}
            />
            <ButtonBar inProgress={inProgress} errorMessage={error?.message}>
              <ActionGroup className="pf-v6-c-form">
                <Button onClick={submit} isDisabled={isCreateDisabled}>
                  {t('Create')}
                </Button>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                  {t('Cancel')}
                </Button>
              </ActionGroup>
            </ButtonBar>
          </Form>
        </div>
      </div>
    </NamespaceSafetyBox>
  );
};

export default CreateStorageClient;
