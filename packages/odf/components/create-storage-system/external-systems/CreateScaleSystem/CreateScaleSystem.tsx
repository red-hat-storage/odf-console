import * as React from 'react';
import { useExistingFileSystemNames } from '@odf/core/components/create-storage-system/external-systems/common/useResourceNameValidation';
import {
  PageHeading,
  useCustomTranslation,
  TextInputWithFieldRequirements,
  ButtonBar,
  DOC_VERSION,
  ocpDocHome,
} from '@odf/shared';
import { ValidatedPasswordInput } from '@odf/shared/text-inputs/password-input';
import { ExternalLink } from '@odf/shared/utils';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router';
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
  HelperTextItemProps,
  AlertVariant,
  ButtonType,
  ButtonVariant,
  Spinner,
} from '@patternfly/react-core';
import { enableScaleEncryption } from '../../../scale-encryption/enableScaleEncryption';
import { ScaleEncryptionForm } from '../../../scale-encryption/ScaleEncryptionForm';
import { useIsLocalClusterConfigured } from '../common/hooks';
import { ScaleNodesSection } from '../common/NodesSection';
import {
  configureMetricsNamespaceLabels,
  createConfigMapPayload,
  createScaleLocalClusterPayload,
  createUserDetailsSecretPayload,
  labelNodes,
} from '../common/payload';
import { getOptimalResourceRequests } from '../common/utils';
import { useKernelDevelEligibility } from './hooks/useKernelDevelEligibility';
import {
  createScaleCaCertSecretPayload,
  createScaleRemoteClusterPayload,
  createFileSystem,
} from './payload';
import {
  KernelDevelEligibility,
  ScaleSystemComponentState,
  initialComponentState,
} from './types';
import useScaleSystemFormValidation from './useFormValidation';
import './CreateScaleSystem.scss';

const KERNEL_DEVEL_DOC_URL =
  `${ocpDocHome(DOC_VERSION)}machine_configuration/machine-configs-configure` +
  '#rhcos-add-extensions_machine-configs-configure';

const getKernelDevelStatus = (
  kernelDevelEligibility: KernelDevelEligibility,
  t: TFunction
): {
  kind: string;
  variant: HelperTextItemProps['variant'];
  message: string;
  details?: string;
} => {
  if (kernelDevelEligibility.error) {
    return {
      kind: 'danger',
      variant: 'error',
      message: t('Unable to verify kernel-devel package status'),
      details: kernelDevelEligibility.error,
    };
  }

  if (kernelDevelEligibility.isLoading) {
    return {
      kind: 'pending',
      variant: 'default',
      message: t('Checking kernel-devel packages on selected nodes'),
    };
  }

  if (kernelDevelEligibility.nodesWithoutKernelDevel.length > 0) {
    return {
      kind: 'warning',
      variant: 'warning',
      message: t(
        'Kernel-devel packages are missing on some selected nodes. Please apply the Machine Config Operator (MCO) update to install them before connecting to the remote cluster.'
      ),
    };
  }

  return {
    kind: 'success',
    variant: 'success',
    message: t('Kernel-devel packages verified'),
  };
};

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
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const localCluster = useIsLocalClusterConfigured();
  const isLocalClusterConfigured = !_.isEmpty(localCluster);
  const kernelDevelEligibility = useKernelDevelEligibility(
    componentState.selectedNodes
  );

  const existingFileSystemNames = useExistingFileSystemNames();

  const {
    fieldRequirements,
    control,
    handleSubmit,
    formState: { isSubmitted },
    isEncryptionValid,
    watch,
    getValues,
  } = useScaleSystemFormValidation(
    existingFileSystemNames,
    componentState.encryptionEnabled
  );

  // Watch only specific fields instead of all form values to prevent excessive re-renders
  const name = watch('name');
  const mandatoryHost = watch('mandatory-endpoint-host');
  const mandatoryPort = watch('mandatory-endpoint-port');
  const userName = watch('userName');
  const password = watch('password');
  const fileSystemName = watch('fileSystemName');
  const hasSelectedNodes = componentState.selectedNodes.length > 0;
  const kernelDevelStatus = hasSelectedNodes
    ? getKernelDevelStatus(kernelDevelEligibility, t)
    : null;

  const mandatoryFieldsValid = !!(
    name &&
    mandatoryHost &&
    mandatoryPort &&
    userName &&
    password &&
    fileSystemName &&
    componentState.selectedNodes.length >= 3 &&
    kernelDevelEligibility.areSelectedNodesEligible
  );

  const isFormValid =
    mandatoryFieldsValid &&
    isEncryptionValid &&
    (!componentState.encryptionEnabled || !!componentState.encryptionCert);

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

  const onCreate = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const formData = getValues();
      const patchNodes = labelNodes(componentState.selectedNodes);
      const { cpuRequest, memoryRequest } = getOptimalResourceRequests(
        componentState.selectedNodes
      );
      if (!isLocalClusterConfigured) {
        await patchNodes();
        const localClusterPromise = createScaleLocalClusterPayload(
          undefined,
          undefined,
          true,
          cpuRequest.toString(),
          memoryRequest
        );
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
        await enableScaleEncryption({
          certificate: componentState.encryptionCert,
          client: formData.client,
          password: formData.encryptionPassword,
          port: formData.encryptionPort,
          remoteRKM: formData.remoteRKM,
          server: formData.serverInformation,
          tenant: formData.tenantId,
          username: formData.encryptionUserName,
        });
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
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t(
                  'Select at least 3 nodes to create the local cluster used for IBM Scale (CNSA) connections.'
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <ScaleNodesSection
            isDisabled={isLocalClusterConfigured}
            selectedNodes={componentState.selectedNodes}
            setSelectedNodes={(nodes) =>
              setComponentState((prev) => ({ ...prev, selectedNodes: nodes }))
            }
            statusContent={
              kernelDevelStatus ? (
                <HelperText className="pf-v6-u-mt-md">
                  <HelperTextItem
                    data-test={`kernel-devel-status-${kernelDevelStatus.kind}`}
                    variant={kernelDevelStatus.variant}
                    icon={
                      kernelDevelStatus.kind === 'pending' ? (
                        <Spinner size="sm" />
                      ) : undefined
                    }
                  >
                    {kernelDevelStatus.message}
                    {kernelDevelStatus.details
                      ? ` ${kernelDevelStatus.details}`
                      : ''}
                    {kernelDevelStatus.kind === 'warning' && (
                      <>
                        {' '}
                        <ExternalLink href={KERNEL_DEVEL_DOC_URL}>
                          {t('Learn more')}
                        </ExternalLink>
                      </>
                    )}
                  </HelperTextItem>
                </HelperText>
              ) : null
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
          <ScaleEncryptionForm
            certificate={componentState.encryptionCert}
            control={control}
            onCertificateChange={(encryptionCert) =>
              setComponentState((prev) => ({ ...prev, encryptionCert }))
            }
          />
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
        <ActionGroup className="pf-v6-c-form">
          <Button
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            isDisabled={loading || !isFormValid}
            isLoading={loading}
            data-test="connect-scale-system"
          >
            {t('Connect and create')}
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
