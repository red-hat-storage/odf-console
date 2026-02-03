import * as React from 'react';
import { useExistingFileSystemNames } from '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation';
import {
  PageHeading,
  useCustomTranslation,
  TextInputWithFieldRequirements,
  ButtonBar,
} from '@odf/shared';
import { ValidatedPasswordInput } from '@odf/shared/text-inputs/password-input';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  FileUpload,
  Checkbox,
  ActionGroup,
  Button,
  Alert,
  FormHelperText,
  HelperText,
  HelperTextItem,
  AlertVariant,
  ButtonType,
  ButtonVariant,
} from '@patternfly/react-core';
import { useIsLocalClusterConfigured } from '../common/hooks';
import { NodesSection } from '../common/NodesSection';
import {
  configureMetricsNamespaceLabels,
  createScaleLocalClusterPayload,
  labelNodes,
} from '../common/payload';
import {
  createScaleCaCertSecretPayload,
  createScaleRemoteClusterPayload,
  createFileSystem,
  createConfigMapPayload,
  createEncryptionConfigPayload,
  createUserDetailsSecretPayload,
} from './payload';
import { ScaleSystemComponentState, initialComponentState } from './types';
import useScaleSystemFormValidation from './useFormValidation';
import './CreateScaleSystem.scss';

type CreateScaleSystemFormProps = {
  componentState: ScaleSystemComponentState;
  setComponentState: React.Dispatch<
    React.SetStateAction<ScaleSystemComponentState>
  >;
};

const CreateScaleSystemForm: React.FC<CreateScaleSystemFormProps> = ({
  componentState,
  setComponentState,
}) => {
  const { t } = useCustomTranslation();
  const [generalCAFileName, setGeneralCAFileName] = React.useState('');
  const [encryptionCAFileName, setEncryptionCAFileName] = React.useState('');
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const localCluster = useIsLocalClusterConfigured();
  const isLocalClusterConfigured = !_.isEmpty(localCluster);

  const existingFileSystemNames = useExistingFileSystemNames();

  const {
    fieldRequirements,
    control,
    handleSubmit,
    formState: { isSubmitted },
    watch,
    getValues,
  } = useScaleSystemFormValidation(existingFileSystemNames);

  // Watch only specific fields instead of all form values to prevent excessive re-renders
  const name = watch('name');
  const mandatoryHost = watch('mandatory-endpoint-host');
  const mandatoryPort = watch('mandatory-endpoint-port');
  const userName = watch('userName');
  const password = watch('password');
  const fileSystemName = watch('fileSystemName');
  const encryptionUserName = watch('encryptionUserName');
  const encryptionPassword = watch('encryptionPassword');
  const encryptionPort = watch('encryptionPort');
  const client = watch('client');
  const remoteRKM = watch('remoteRKM');
  const serverInformation = watch('serverInformation');
  const tenantId = watch('tenantId');

  const mandatoryFieldsValid = !!(
    name &&
    mandatoryHost &&
    mandatoryPort &&
    userName &&
    password &&
    fileSystemName &&
    componentState.selectedNodes.length > 0
  );

  const encryptionFieldsValid =
    !componentState.encryptionEnabled ||
    !!(
      encryptionUserName &&
      encryptionPassword &&
      encryptionPort &&
      client &&
      remoteRKM &&
      serverInformation &&
      tenantId
    );

  const isFormValid = mandatoryFieldsValid && encryptionFieldsValid;

  const handleGeneralCAFileInputChange = React.useCallback(
    (_ev, file: File) => {
      setGeneralCAFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Convert the file content to base64
        const base64Content = btoa(result);
        setComponentState((prev) => ({
          ...prev,
          caCertificate: base64Content,
        }));
      };
      reader.readAsText(file);
    },
    [setComponentState]
  );

  const handleEncryptionCAFileInputChange = React.useCallback(
    (_ev, file: File) => {
      setEncryptionCAFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Convert the file content to base64
        const base64Content = btoa(result);
        setComponentState((prev) => ({
          ...prev,
          encryptionCert: base64Content,
        }));
      };
      reader.readAsText(file);
    },
    [setComponentState]
  );

  const onCreate = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const formData = getValues();
      const patchNodes = labelNodes(componentState.selectedNodes);
      if (!isLocalClusterConfigured) {
        await patchNodes();
        const localClusterPromise = createScaleLocalClusterPayload();
        await localClusterPromise();
        await configureMetricsNamespaceLabels();
      }
      const secretPromise = createScaleCaCertSecretPayload(
        formData.name,
        componentState.caCertificate
      );
      const userDetailsSecretName = `${formData.name}-user-details-secret`;
      const userDetailsSecretPromise = createUserDetailsSecretPayload(
        userDetailsSecretName,
        formData.userName,
        formData.password
      );
      const endpointHostNames = [
        formData['mandatory-endpoint-host'],
        ...(formData['optional-endpoint-1-host']
          ? [formData['optional-endpoint-1-host']]
          : []),
        ...(formData['optional-endpoint-2-host']
          ? [formData['optional-endpoint-2-host']]
          : []),
      ];
      const remoteClusterCaCert = `${formData.name}-ca-cert`;
      const remoteClusterConfigMapPromise = createConfigMapPayload(
        remoteClusterCaCert,
        {
          'ca.crt': componentState.caCertificate,
        }
      );
      const remoteClusterPromise = createScaleRemoteClusterPayload(
        formData.name,
        endpointHostNames,
        formData['mandatory-endpoint-port'],
        userDetailsSecretName,
        componentState.caCertificate ? remoteClusterCaCert : undefined
      );
      const encryptionSecretName = `${formData.name}-encryption-secret`;
      const encryptionSecretPromise = createUserDetailsSecretPayload(
        encryptionSecretName,
        formData.encryptionUserName,
        formData.encryptionPassword
      );
      const encryptionConfigMapName = `${formData.name}-encryption-config`;
      const encryptionConfigMapPromise = createConfigMapPayload(
        encryptionConfigMapName,
        {
          'enc-ca.crt': componentState.encryptionCert,
        }
      );
      const encryptionConfigPromise = createEncryptionConfigPayload(
        `${formData.name}-encryption-config`,
        formData.serverInformation,
        formData.tenantId,
        formData.client,
        formData.encryptionPassword,
        encryptionConfigMapName
      );
      const fileSystemPromise = createFileSystem(
        formData.name,
        formData.fileSystemName
      );

      if (componentState.caCertificate) {
        await secretPromise();
      }
      await userDetailsSecretPromise();
      if (componentState.caCertificate) {
        await remoteClusterConfigMapPromise();
      }
      await remoteClusterPromise();
      await fileSystemPromise();
      if (componentState.encryptionEnabled) {
        await encryptionConfigMapPromise();
        await encryptionSecretPromise();
        await encryptionConfigPromise();
      }
      navigate(
        `/odf/external-systems/scale.spectrum.ibm.com~v1beta1~remotecluster/${formData.name}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    componentState.caCertificate,
    componentState.encryptionCert,
    componentState.encryptionEnabled,
    componentState.selectedNodes,
    getValues,
    isLocalClusterConfigured,
    navigate,
  ]);

  return (
    <Form onSubmit={handleSubmit(onCreate)} isWidthLimited>
      <FormSection title={t('General configuration')}>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.name}
          popoverProps={{
            headerContent: t('Name requirements'),
            footerContent: `${t('Example')}: my-scale-system`,
          }}
          formGroupProps={{
            label: t('Name'),
            fieldId: 'name',
            isRequired: true,
          }}
          textInputProps={{
            id: 'name',
            name: 'name',
            type: 'text',
            placeholder: t('Enter a name for the external system'),
            'data-test': 'scale-system-name',
          }}
          helperText={t(
            'A unique connection name to identify this external system in Data Foundation.'
          )}
        />
        <FormGroup label={t('Select local cluster nodes')} isRequired>
          <NodesSection
            isDisabled={isLocalClusterConfigured}
            selectedNodes={componentState.selectedNodes}
            setSelectedNodes={(nodes) =>
              setComponentState((prev) => ({ ...prev, selectedNodes: nodes }))
            }
          />
        </FormGroup>
      </FormSection>
      <FormSection title={t('Connection details')}>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Enter at least one IBM Scale management endpoint to authenticate and configure the remote cluster (For high availability, define 2 or more endpoints). Use valid credentials to verify and establish a connection to the remote cluster.'
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <Grid hasGutter>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.hostname}
              popoverProps={{
                headerContent: t('Hostname requirements'),
                footerContent: `${t('Example')}: hostname.example.com`,
              }}
              formGroupProps={{
                label: t('Management endpoints'),
                fieldId: 'mandatory-endpoint-host',
                isRequired: true,
              }}
              textInputProps={{
                id: 'mandatory-endpoint-host',
                name: 'mandatory-endpoint-host',
                type: 'text',
                placeholder: t('Mandatory (e.g hostname.example.com)'),
                'data-test': 'mandatory-endpoint-host',
              }}
            />
          </GridItem>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.port}
              popoverProps={{
                headerContent: t('Port requirements'),
                footerContent: `${t('Example')}: 8843`,
              }}
              formGroupProps={{
                label: t('Port'),
                fieldId: 'mandatory-endpoint-port',
                isRequired: true,
              }}
              textInputProps={{
                id: 'mandatory-endpoint-port',
                name: 'mandatory-endpoint-port',
                type: 'text',
                placeholder: t('Mandatory (e.g 8843)'),
                'data-test': 'mandatory-endpoint-port',
              }}
            />
          </GridItem>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.hostname}
              popoverProps={{
                headerContent: t('Hostname requirements'),
                footerContent: `${t('Example')}: hostname.example.com`,
              }}
              formGroupProps={{
                label: t('Optional endpoint 1'),
                fieldId: 'optional-endpoint-1-host',
              }}
              textInputProps={{
                id: 'optional-endpoint-1-host',
                name: 'optional-endpoint-1-host',
                type: 'text',
                placeholder: t('Optional (e.g hostname.example.com)'),
                'data-test': 'optional-endpoint-1-host',
              }}
            />
          </GridItem>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.port}
              popoverProps={{
                headerContent: t('Port requirements'),
                footerContent: `${t('Example')}: 8843`,
              }}
              formGroupProps={{
                label: t('Optional port 1'),
                fieldId: 'optional-endpoint-1-port',
              }}
              textInputProps={{
                id: 'optional-endpoint-1-port',
                name: 'optional-endpoint-1-port',
                type: 'text',
                placeholder: t('Optional (e.g 8843)'),
                'data-test': 'optional-endpoint-1-port',
              }}
            />
          </GridItem>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.hostname}
              popoverProps={{
                headerContent: t('Hostname requirements'),
                footerContent: `${t('Example')}: hostname.example.com`,
              }}
              formGroupProps={{
                label: t('Optional endpoint 2'),
                fieldId: 'optional-endpoint-2-host',
              }}
              textInputProps={{
                id: 'optional-endpoint-2-host',
                name: 'optional-endpoint-2-host',
                type: 'text',
                placeholder: t('Optional (e.g hostname.example.com)'),
                'data-test': 'optional-endpoint-2-host',
              }}
            />
          </GridItem>
          <GridItem span={6}>
            <TextInputWithFieldRequirements
              control={control}
              fieldRequirements={fieldRequirements.port}
              popoverProps={{
                headerContent: t('Port requirements'),
                footerContent: `${t('Example')}: 8843`,
              }}
              formGroupProps={{
                label: t('Optional port 2'),
                fieldId: 'optional-endpoint-2-port',
              }}
              textInputProps={{
                id: 'optional-endpoint-2-port',
                name: 'optional-endpoint-2-port',
                type: 'text',
                placeholder: t('Optional (e.g 8843)'),
                'data-test': 'optional-endpoint-2-port',
              }}
            />
          </GridItem>
        </Grid>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.username}
          popoverProps={{
            headerContent: t('Username requirements'),
            footerContent: `${t('Example')}: admin`,
          }}
          formGroupProps={{
            label: t('User name'),
            fieldId: 'userName',
            isRequired: true,
          }}
          textInputProps={{
            id: 'userName',
            name: 'userName',
            type: 'text',
            placeholder: t('Enter username'),
            'data-test': 'username',
          }}
        />
        <ValidatedPasswordInput
          control={control}
          fieldRequirements={fieldRequirements.password}
          popoverProps={{
            headerContent: t('Password requirements'),
            footerContent: `${t('Example')}: mypassword123`,
          }}
          formGroupProps={{
            label: t('Password'),
            fieldId: 'password',
            isRequired: true,
          }}
          textInputProps={{
            id: 'password',
            name: 'password',
            placeholder: t('Enter password'),
            'data-test': 'password',
          }}
          helperText={t('Password is required')}
        />
        <FormGroup label={t('CA certificate')}>
          <FileUpload
            placeholder={t('Upload CA certificate')}
            id="file-upload"
            value={componentState.caCertificate}
            filename={generalCAFileName}
            onClearClick={() => {
              setGeneralCAFileName('');
              setComponentState((prev) => ({ ...prev, caCertificate: '' }));
            }}
            onFileInputChange={handleGeneralCAFileInputChange}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t('Upload a certificate to secure your configuration.')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>
      <FormSection title={t('File system configuration')}>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t('Specify the remote file system to access on this cluster.')}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements.fileSystemName}
          popoverProps={{
            headerContent: t('File system name requirements'),
            footerContent: `${t('Example')}: my-filesystem`,
          }}
          formGroupProps={{
            label: t('File system name'),
            fieldId: 'fileSystemName',
            isRequired: true,
          }}
          textInputProps={{
            id: 'fileSystemName',
            name: 'fileSystemName',
            type: 'text',
            placeholder: t('Enter the file system name'),
            'data-test': 'file-system-name',
          }}
        />
        <FormGroup>
          <Checkbox
            id="encryption-enabled"
            label={t('Enable data encryption')}
            isChecked={componentState.encryptionEnabled}
            onChange={(_ev, checked) =>
              setComponentState((prev) => ({
                ...prev,
                encryptionEnabled: checked,
              }))
            }
            description={t(
              'Ensures all filesystem data is securely stored and protected.'
            )}
          />
        </FormGroup>
        {componentState.encryptionEnabled && (
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
                placeholder: t('Enter port'),
                'data-test': 'encryption-port',
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
              }}
            />
            <FormGroup label={t('Encryption CA certificate')} isRequired>
              <FileUpload
                placeholder={t('Upload encryption CA certificate')}
                id="file-upload"
                value={componentState.encryptionCert}
                filename={encryptionCAFileName}
                onFileInputChange={handleEncryptionCAFileInputChange}
                onClearClick={() => {
                  setEncryptionCAFileName('');
                  setComponentState((prev) => ({
                    ...prev,
                    encryptionCert: '',
                  }));
                }}
              />
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
                placeholder: t('Enter server information'),
                'data-test': 'server-information',
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
              }}
            />
          </>
        )}
      </FormSection>
      {!isFormValid && isSubmitted && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Address form errors to proceed')}
        />
      )}
      {error && (
        <Alert variant="danger" title={t('Error')} isInline>
          {error}
        </Alert>
      )}
      <ButtonBar errorMessage={error}>
        <ActionGroup className="pf-v5-c-form">
          <Button
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            isDisabled={loading || !isFormValid}
            isLoading={loading}
            data-test="connect-scale-system"
          >
            {t('Connect')}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            type={ButtonType.button}
            variant={ButtonVariant.secondary}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export const CreateScaleSystem: React.FC = () => {
  const [componentState, setComponentState] =
    React.useState<ScaleSystemComponentState>(initialComponentState);
  const { t } = useCustomTranslation();

  return (
    <>
      <PageHeading
        title={t('Connect IBM Scale (CNSA)')}
        hasUnderline={false}
        breadcrumbs={[
          {
            name: t('External Systems'),
            path: '/odf/external-systems',
          },
          {
            name: t('Create IBM Scale (CNSA)'),
            path: '/odf/external-systems/scale/~create',
          },
        ]}
      >
        {t(
          'Connect to IBM Scale (CNSA) to power Data Foundation with fast, reliable file storage optimized for enterprise performance.'
        )}
      </PageHeading>
      <div className="odf-m-pane__body">
        <CreateScaleSystemForm
          componentState={componentState}
          setComponentState={setComponentState}
        />
      </div>
    </>
  );
};

export default CreateScaleSystem;
