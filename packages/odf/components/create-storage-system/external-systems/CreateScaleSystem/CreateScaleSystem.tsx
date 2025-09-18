import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { useNodesData } from '@odf/core/hooks';
import { NodeData } from '@odf/core/types';
import {
  PageHeading,
  useCustomTranslation,
  TextInputWithFieldRequirements,
  formSettings,
  useYupValidationResolver,
  ButtonBar,
} from '@odf/shared';
import { useForm } from 'react-hook-form';
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
  Card,
  CardHeader,
  Flex,
  CardTitle,
  CardBody,
  FlexItem,
  FormHelperText,
  HelperText,
  HelperTextItem,
  AlertVariant,
  ButtonType,
  ButtonVariant,
} from '@patternfly/react-core';
import { WizardNodeState } from '../../reducer';
import { SelectNodesTable } from '../../select-nodes-table/select-nodes-table';
import {
  createScaleCaCertSecretPayload,
  createScaleLocalClusterPayload,
  createScaleRemoteClusterPayload,
  labelNodes,
  createFileSystem,
  createConfigMapPayload,
  createEncryptionConfigPayload,
  createUserDetailsSecretPayload,
} from './payload';
import {
  initialState,
  ScaleSystemAction,
  scaleSystemReducer,
  ScaleSystemState,
} from './reducer';
import useScaleSystemFormValidation from './useFormValidation';
import './CreateScaleSystem.scss';

type CreateScaleSystemFormProps = {
  state: ScaleSystemState | typeof initialState;
  dispatch: React.Dispatch<ScaleSystemAction>;
};

type NodesSectionProps = {
  selectedNodes: WizardNodeState[];
  dispatch: React.Dispatch<ScaleSystemAction>;
};

const NodesSection: React.FC<NodesSectionProps> = React.memo(
  ({ selectedNodes, dispatch }) => {
    const { t } = useCustomTranslation();
    const [isUseAllNodes, setIsUseAllNodes] = React.useState(true);
    const [allNodes, allNodesLoaded] = useNodesData();

    const onNodeSelect = React.useCallback(
      (nodes: NodeData[]) => {
        const nodesData = createWizardNodeState(nodes);
        dispatch({ type: 'SET_SELECTED_NODES', payload: nodesData });
      },
      [dispatch]
    );

    // When "All nodes" is selected, actually select all available nodes
    React.useEffect(() => {
      if (
        isUseAllNodes &&
        allNodesLoaded &&
        allNodes.length > 0 &&
        selectedNodes.length === 0
      ) {
        const allNodesData = createWizardNodeState(allNodes);
        dispatch({ type: 'SET_SELECTED_NODES', payload: allNodesData });
      }
    }, [
      isUseAllNodes,
      allNodesLoaded,
      allNodes,
      selectedNodes.length,
      dispatch,
    ]);

    return (
      <>
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Card
              className="odf-create-scale-system__card"
              isSelected={isUseAllNodes}
              isRounded
              isSelectable
              id="all-nodes"
            >
              <CardHeader
                selectableActions={{
                  onChange: () => setIsUseAllNodes(true),
                  selectableActionId: 'use-all-nodes',
                  variant: 'single',
                  name: 'node-selector',
                  selectableActionAriaLabelledby: 'all-nodes',
                }}
              >
                <CardTitle>{t('All nodes')}</CardTitle>
              </CardHeader>
              <CardBody>
                {t(
                  'All non control plane nodes are selected to handle requests to IBM Scale'
                )}
              </CardBody>
            </Card>
          </FlexItem>
          <FlexItem>
            <Card
              className="odf-create-scale-system__card"
              isSelected={!isUseAllNodes}
              isRounded
              isSelectable
              id="selected-nodes"
            >
              <CardHeader
                selectableActions={{
                  onChange: () => setIsUseAllNodes(false),
                  selectableActionId: 'use-selected-nodes',
                  variant: 'single',
                  name: 'node-selector',
                  selectableActionAriaLabelledby: 'selected-nodes',
                }}
              >
                <CardTitle>{t('Select nodes')}</CardTitle>
              </CardHeader>
              <CardBody>
                {t(
                  'Select a minimum of 3 nodes to handle requests to IBM scale'
                )}
              </CardBody>
            </Card>
          </FlexItem>
        </Flex>
        {!isUseAllNodes && (
          <SelectNodesTable
            nodes={selectedNodes}
            onRowSelected={onNodeSelect}
            systemNamespace={''}
          />
        )}
      </>
    );
  }
);

const CreateScaleSystemForm: React.FC<CreateScaleSystemFormProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [generalCAFileName, setGeneralCAFileName] = React.useState('');
  const [encryptionCAFileName, setEncryptionCAFileName] = React.useState('');
  const navigate = useNavigate();
  const [error, setError] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  const { formSchema, fieldRequirements } = useScaleSystemFormValidation();
  const resolver = useYupValidationResolver(formSchema);

  const {
    control,
    handleSubmit,
    formState: { isSubmitted },
    watch,
  } = useForm({
    ...formSettings,
    resolver,
    defaultValues: {
      name: state.name || '',
      'mandatory-endpoint-host':
        state.managementEndpoint?.['mandatory-endpoint']?.host || '',
      'mandatory-endpoint-port':
        state.managementEndpoint?.['mandatory-endpoint']?.port || '',
      'optional-endpoint-1-host':
        state.managementEndpoint?.['optional-endpoint-1']?.host || '',
      'optional-endpoint-1-port':
        state.managementEndpoint?.['optional-endpoint-1']?.port || '',
      'optional-endpoint-2-host':
        state.managementEndpoint?.['optional-endpoint-2']?.host || '',
      'optional-endpoint-2-port':
        state.managementEndpoint?.['optional-endpoint-2']?.port || '',
      userName: state.userName || '',
      password: state.password || '',
      fileSystemName: state.fileSystemName || '',
      encryptionUserName: state.encryptionUserName || '',
      encryptionPassword: state.encryptionPassword || '',
      encryptionPort: state.encrptionPort || '',
      client: state.client || '',
      remoteRKM: state.remoteRKM || '',
      serverInformation: state.serverInformation || '',
      tenantId: state.tenantId || '',
    },
  });

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

  // No real-time state sync during typing - only sync on form submission for maximum performance

  // Memoize form validation to prevent excessive recalculations
  const mandatoryFieldsValid = React.useMemo(() => {
    const isValid = !!(
      name &&
      mandatoryHost &&
      mandatoryPort &&
      userName &&
      password &&
      fileSystemName &&
      state.selectedNodes.length > 0 &&
      state.caCertificate
    );

    return isValid;
  }, [
    name,
    mandatoryHost,
    mandatoryPort,
    userName,
    password,
    fileSystemName,
    state.selectedNodes.length,
    state.caCertificate,
  ]);

  // Check encryption fields only if encryption is enabled
  const encryptionFieldsValid = React.useMemo(() => {
    if (!state.encryptionEnabled) return true;

    return !!(
      encryptionUserName &&
      encryptionPassword &&
      encryptionPort &&
      client &&
      remoteRKM &&
      serverInformation &&
      tenantId
    );
  }, [
    state.encryptionEnabled,
    encryptionUserName,
    encryptionPassword,
    encryptionPort,
    client,
    remoteRKM,
    serverInformation,
    tenantId,
  ]);

  const isFormValid = mandatoryFieldsValid && encryptionFieldsValid;

  const handleGeneralCAFileInputChange = React.useCallback(
    (_ev, file: File) => {
      setGeneralCAFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Convert the file content to base64
        const base64Content = btoa(result);
        dispatch({
          type: 'SET_CA_CERTIFICATE',
          payload: base64Content,
        });
      };
      reader.readAsText(file);
    },
    [dispatch]
  );

  const handleEncryptionCAFileInputChange = React.useCallback(
    (_ev, file: File) => {
      setEncryptionCAFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Convert the file content to base64
        const base64Content = btoa(result);
        dispatch({
          type: 'SET_ENCRYPTION_CERT',
          payload: base64Content,
        });
      };
      reader.readAsText(file);
    },
    [dispatch]
  );

  const onCreate = React.useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const patchNodes = labelNodes(state.selectedNodes);
      const secretPromise = createScaleCaCertSecretPayload(
        name || state.name,
        state.caCertificate
      );
      const localClusterPromise = createScaleLocalClusterPayload();
      const endpointHostNames = [
        mandatoryHost || state.managementEndpoint?.['mandatory-endpoint']?.host,
        ...(state.managementEndpoint?.['optional-endpoint-1']?.host
          ? [state.managementEndpoint['optional-endpoint-1'].host]
          : []),
        ...(state.managementEndpoint?.['optional-endpoint-2']?.host
          ? [state.managementEndpoint['optional-endpoint-2'].host]
          : []),
      ];
      const remoteClusterCaCert = `${name || state.name}-ca-cert`;
      const remoteClusterConfigMapPromise = createConfigMapPayload(
        remoteClusterCaCert,
        {
          'ca.crt': state.caCertificate,
        }
      );
      const remoteClusterPromise = createScaleRemoteClusterPayload(
        `${name || state.name}`,
        endpointHostNames,
        remoteClusterCaCert
      );
      const encryptionSecretName = `${name || state.name}-encryption-secret`;
      const encryptionSecretPromise = createUserDetailsSecretPayload(
        encryptionSecretName,
        encryptionUserName || state.encryptionUserName,
        encryptionPassword || state.encryptionPassword
      );
      const encryptionConfigMapName = `${name || state.name}-encryption-config`;
      const encryptionConfigMapPromise = createConfigMapPayload(
        encryptionConfigMapName,
        {
          'enc-ca.crt': state.encryptionCert,
        }
      );
      const encryptionConfigPromise = createEncryptionConfigPayload(
        `${name || state.name}-encryption-config`,
        serverInformation || state.serverInformation,
        tenantId || state.tenantId,
        client || state.client,
        encryptionPassword || state.encryptionPassword,
        encryptionConfigMapName
      );
      const fileSystemPromise = createFileSystem(
        fileSystemName || state.fileSystemName
      );

      await patchNodes();
      if (state.caCertificate) {
        await secretPromise();
      }
      await localClusterPromise();
      if (state.caCertificate) {
        await remoteClusterConfigMapPromise();
      }
      await remoteClusterPromise();
      await fileSystemPromise();
      if (state.encryptionEnabled) {
        await encryptionConfigMapPromise();
        await encryptionSecretPromise();
        await encryptionConfigPromise();
      }
      navigate(
        `/odf/external-systems/scale.spectrum.ibm.com~v1beta1~remotecluster/${name || state.name}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    state,
    name,
    mandatoryHost,
    encryptionUserName,
    encryptionPassword,
    serverInformation,
    tenantId,
    client,
    fileSystemName,
    navigate,
  ]);

  const onSubmit = async (formData: any) => {
    // Update state with form data
    dispatch({ type: 'SET_NAME', payload: formData.name });
    dispatch({
      type: 'SET_MANAGEMENT_ENDPOINT_HOST',
      payload: {
        id: 'mandatory-endpoint',
        host: formData['mandatory-endpoint-host'],
      },
    });
    dispatch({
      type: 'SET_MANAGEMENT_ENDPOINT_PORT',
      payload: {
        id: 'mandatory-endpoint',
        port: formData['mandatory-endpoint-port'],
      },
    });
    if (formData['optional-endpoint-1-host']) {
      dispatch({
        type: 'SET_MANAGEMENT_ENDPOINT_HOST',
        payload: {
          id: 'optional-endpoint-1',
          host: formData['optional-endpoint-1-host'],
        },
      });
    }
    if (formData['optional-endpoint-1-port']) {
      dispatch({
        type: 'SET_MANAGEMENT_ENDPOINT_PORT',
        payload: {
          id: 'optional-endpoint-1',
          port: formData['optional-endpoint-1-port'],
        },
      });
    }
    if (formData['optional-endpoint-2-host']) {
      dispatch({
        type: 'SET_MANAGEMENT_ENDPOINT_HOST',
        payload: {
          id: 'optional-endpoint-2',
          host: formData['optional-endpoint-2-host'],
        },
      });
    }
    if (formData['optional-endpoint-2-port']) {
      dispatch({
        type: 'SET_MANAGEMENT_ENDPOINT_PORT',
        payload: {
          id: 'optional-endpoint-2',
          port: formData['optional-endpoint-2-port'],
        },
      });
    }
    dispatch({ type: 'SET_USER_NAME', payload: formData.userName });
    dispatch({ type: 'SET_PASSWORD', payload: formData.password });
    dispatch({
      type: 'SET_FILE_SYSTEM_NAME',
      payload: formData.fileSystemName,
    });
    if (state.encryptionEnabled) {
      dispatch({
        type: 'SET_ENCRYPTION_USER_NAME',
        payload: formData.encryptionUserName,
      });
      dispatch({
        type: 'SET_ENCRYPTION_PASSWORD',
        payload: formData.encryptionPassword,
      });
      dispatch({
        type: 'SET_ENCRYPTION_PORT',
        payload: formData.encryptionPort,
      });
      dispatch({ type: 'SET_CLIENT', payload: formData.client });
      dispatch({ type: 'SET_REMOTE_RKM', payload: formData.remoteRKM });
      dispatch({
        type: 'SET_SERVER_INFORMATION',
        payload: formData.serverInformation,
      });
      dispatch({ type: 'SET_TENANT_ID', payload: formData.tenantId });
    }

    // Call the original onCreate function
    await onCreate();
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} isWidthLimited>
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
            selectedNodes={state.selectedNodes}
            dispatch={dispatch}
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
        <TextInputWithFieldRequirements
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
            type: 'password',
            placeholder: t('Enter password'),
            'data-test': 'password',
          }}
          helperText={t('Password is required')}
        />
        <FormGroup label={t('CA certificate')} isRequired>
          <FileUpload
            placeholder={t('Upload CA certificate')}
            id="file-upload"
            value={state.caCertificate}
            filename={generalCAFileName}
            onClearClick={() => {
              setGeneralCAFileName('');
              dispatch({ type: 'SET_CA_CERTIFICATE', payload: '' });
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
            isChecked={state.encryptionEnabled}
            onChange={(_ev, checked) =>
              dispatch({ type: 'SET_ENCRYPTION_ENABLED', payload: checked })
            }
            description={t(
              'Ensures all filesystem data is securely stored and protected.'
            )}
          />
        </FormGroup>
        {state.encryptionEnabled && (
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
            <TextInputWithFieldRequirements
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
                type: 'password',
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
                value={state.encryptionCert}
                filename={encryptionCAFileName}
                onFileInputChange={handleEncryptionCAFileInputChange}
                onClearClick={() => {
                  setEncryptionCAFileName('');
                  dispatch({ type: 'SET_ENCRYPTION_CERT', payload: '' });
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
  const [state, dispatch] = React.useReducer<
    React.Reducer<ScaleSystemState, ScaleSystemAction>
  >(scaleSystemReducer, initialState);
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
        <CreateScaleSystemForm state={state} dispatch={dispatch} />
      </div>
    </>
  );
};

export default CreateScaleSystem;
