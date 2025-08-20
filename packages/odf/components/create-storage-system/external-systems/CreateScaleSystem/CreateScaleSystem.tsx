import * as React from 'react';
import { createWizardNodeState } from '@odf/core/components/utils';
import { NodeData } from '@odf/core/types';
import { PageHeading, useCustomTranslation } from '@odf/shared';
import PasswordInput from '@odf/shared/text-inputs/password-input';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Form,
  FormGroup,
  FormSection,
  Grid,
  GridItem,
  FileUpload,
  TextInput,
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
import './CreateScaleSystem.scss';

type CreateScaleSystemFormProps = {
  state: ScaleSystemState | typeof initialState;
  dispatch: React.Dispatch<ScaleSystemAction>;
};

type NodesSectionProps = {
  selectedNodes: WizardNodeState[];
  dispatch: React.Dispatch<ScaleSystemAction>;
};

const NodesSection: React.FC<NodesSectionProps> = ({
  selectedNodes,
  dispatch,
}) => {
  const { t } = useCustomTranslation();
  const [isUseAllNodes, setIsUseAllNodes] = React.useState(false);

  const onNodeSelect = (nodes: NodeData[]) => {
    const nodesData = createWizardNodeState(nodes);
    dispatch({ type: 'SET_SELECTED_NODES', payload: nodesData });
  };

  return (
    <>
      <Flex direction={{ default: 'row' }}>
        <FlexItem>
          <Card
            isClickable
            className="odf-create-scale-system__card"
            isSelected={isUseAllNodes}
            isRounded
          >
            <CardHeader
              selectableActions={{
                onClickAction: () => setIsUseAllNodes(true),
                selectableActionId: 'use-all-nodes',
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
            isClickable
            className="odf-create-scale-system__card"
            isSelected={!isUseAllNodes}
            isRounded
          >
            <CardHeader
              selectableActions={{
                onClickAction: () => setIsUseAllNodes(false),
                selectableActionId: 'use-selected-nodes',
              }}
            >
              <CardTitle>{t('Select nodes')}</CardTitle>
            </CardHeader>
            <CardBody>
              {t('Select a minimum of 3 nodes to handle requests to IBM scale')}
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
};

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

  const handleGeneralCAFileInputChange = (_ev, file: File) => {
    setGeneralCAFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      dispatch({
        type: 'SET_CA_CERTIFICATE',
        payload: e.target?.result as string,
      });
    };
    reader.readAsText(file);
  };
  const handleEncryptionCAFileInputChange = (_ev, file: File) => {
    setEncryptionCAFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      dispatch({
        type: 'SET_CA_CERTIFICATE',
        payload: e.target?.result as string,
      });
    };
    reader.readAsText(file);
  };

  const onCreate = async () => {
    setLoading(true);
    const patchNodes = labelNodes(state.selectedNodes);
    const secretPromise = createScaleCaCertSecretPayload(
      state.name,
      state.caCertificate
    );
    const localClusterPromise = createScaleLocalClusterPayload();
    const endpointHostNames = [
      state.managementEndpoint?.['mandatory-endpoint']?.host,
      ...(state.managementEndpoint?.['optional-endpoint-1']?.host
        ? [state.managementEndpoint['optional-endpoint-1'].host]
        : []),
      ...(state.managementEndpoint?.['optional-endpoint-2']?.host
        ? [state.managementEndpoint['optional-endpoint-2'].host]
        : []),
    ];
    const remoteClusterCaCert = `${state.name}-ca-cert`;
    const remoteClusterConfigMapPromise = createConfigMapPayload(
      remoteClusterCaCert,
      {
        'ca.crt': state.caCertificate,
      }
    );
    const remoteClusterPromise = createScaleRemoteClusterPayload(
      `${state.name}`,
      endpointHostNames,
      remoteClusterCaCert
    );
    const encryptionSecretName = `${state.name}-encryption-secret`;
    const encryptionSecretPromise = createUserDetailsSecretPayload(
      encryptionSecretName,
      state.encryptionUserName,
      state.encryptionPassword
    );
    const encryptionConfigMapName = `${state.name}-encryption-config`;
    const encryptionConfigMapPromise = createConfigMapPayload(
      encryptionConfigMapName,
      {
        'enc-ca.crt': state.encryptionCert,
      }
    );
    const encryptionConfigPromise = createEncryptionConfigPayload(
      `${state.name}-encryption-config`,
      state.serverInformation,
      state.tenantId,
      state.client,
      state.encryptionPassword,
      encryptionConfigMapName
    );
    const fileSystemPromise = createFileSystem(state.fileSystemName);
    try {
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
        `/odf/external-systems/scale.spectrum.ibm.com~v1beta1~remotecluster/${state.name}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form isWidthLimited>
      <FormSection title={t('General configuration')}>
        <FormGroup label={t('Name')} isRequired>
          <TextInput
            placeholder={t('Enter a name for the external system')}
            value={state.name}
            onChange={(_ev, value) =>
              dispatch({ type: 'SET_NAME', payload: value })
            }
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t(
                  'A unique connection name to identify this external system in Data Foundation.'
                )}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
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
            <FormGroup label={t('Management endpoints')} isRequired>
              <TextInput
                placeholder={t('Mandatory (e.g hostname.example.com)')}
                value={state.managementEndpoint?.['mandatory-endpoint']?.host}
                onChange={(_ev, value) =>
                  dispatch({
                    type: 'SET_MANAGEMENT_ENDPOINT_HOST',
                    payload: {
                      id: 'mandatory-endpoint',
                      host: value,
                    },
                  })
                }
              />
            </FormGroup>
          </GridItem>
          <GridItem span={6}>
            <FormGroup label={t('Port')} isRequired>
              <TextInput
                placeholder={t('Mandatory (e.g 8843)')}
                value={state.managementEndpoint?.['mandatory-endpoint']?.port}
                onChange={(_ev, value) =>
                  dispatch({
                    type: 'SET_MANAGEMENT_ENDPOINT_PORT',
                    payload: { id: 'mandatory-endpoint', port: value },
                  })
                }
              />
            </FormGroup>
          </GridItem>
          <GridItem span={6}>
            <TextInput
              placeholder={t('Optional (e.g hostname.example.com)')}
              value={state.managementEndpoint?.['optional-endpoint-1']?.host}
              onChange={(_ev, value) =>
                dispatch({
                  type: 'SET_MANAGEMENT_ENDPOINT_HOST',
                  payload: { id: 'optional-endpoint-1', host: value },
                })
              }
            />
          </GridItem>
          <GridItem span={6}>
            <TextInput
              placeholder={t('Optional (e.g 8843)')}
              value={state.managementEndpoint?.['optional-endpoint-1']?.port}
              onChange={(_ev, value) =>
                dispatch({
                  type: 'SET_MANAGEMENT_ENDPOINT_PORT',
                  payload: { id: 'optional-endpoint-1', port: value },
                })
              }
            />
          </GridItem>
          <GridItem span={6}>
            <TextInput
              placeholder={t('Optional (e.g hostname.example.com)')}
              value={state.managementEndpoint?.['optional-endpoint-2']?.host}
              onChange={(_ev, value) =>
                dispatch({
                  type: 'SET_MANAGEMENT_ENDPOINT_HOST',
                  payload: { id: 'optional-endpoint-2', host: value },
                })
              }
            />
          </GridItem>
          <GridItem span={6}>
            <TextInput
              placeholder={t('Optional (e.g 8843)')}
              value={state.managementEndpoint?.['optional-endpoint-2']?.port}
              onChange={(_ev, value) =>
                dispatch({
                  type: 'SET_MANAGEMENT_ENDPOINT_PORT',
                  payload: { id: 'optional-endpoint-2', port: value },
                })
              }
            />
          </GridItem>
        </Grid>
        <FormGroup label={t('User name')} isRequired>
          <TextInput
            placeholder={t('Enter username')}
            value={state.userName}
            onChange={(_ev, value) =>
              dispatch({ type: 'SET_USER_NAME', payload: value })
            }
          />
        </FormGroup>
        <FormGroup label={t('Password')} isRequired>
          <PasswordInput
            placeholder={t('Enter password')}
            id="password"
            value={state.password}
            onChange={(value) =>
              dispatch({ type: 'SET_PASSWORD', payload: value })
            }
          />
        </FormGroup>
        <FormGroup label={t('CA certificate')} isRequired>
          <FileUpload
            placeholder={t('Upload CA certificate')}
            id="file-upload"
            value={state.caCertificate}
            filename={generalCAFileName}
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
        <FormGroup label={t('File system name')} isRequired>
          <TextInput
            placeholder={t('Enter the file system name')}
            value={state.fileSystemName}
            onChange={(_ev, value) =>
              dispatch({ type: 'SET_FILE_SYSTEM_NAME', payload: value })
            }
          />
        </FormGroup>
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
            <FormGroup label={t('Username')} isRequired>
              <TextInput
                placeholder={t('Enter username')}
                value={state.encryptionUserName}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_ENCRYPTION_USER_NAME', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Password')} isRequired>
              <PasswordInput
                placeholder={t('Enter password')}
                id="encryption-password"
                value={state.encryptionPassword}
                onChange={(value) =>
                  dispatch({ type: 'SET_ENCRYPTION_PASSWORD', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Port')} isRequired>
              <TextInput
                placeholder={t('Enter port')}
                value={state.encrptionPort}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_ENCRYPTION_PORT', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Client')} isRequired>
              <TextInput
                placeholder={t('Enter client')}
                value={state.client}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_CLIENT', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Remote RKM')} isRequired>
              <TextInput
                placeholder={t('Enter remote RKM')}
                value={state.remoteRKM}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_REMOTE_RKM', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Encryption CA certificate')} isRequired>
              <FileUpload
                placeholder={t('Upload encryption CA certificate')}
                id="file-upload"
                value={state.encryptionCert}
                filename={encryptionCAFileName}
                onFileInputChange={handleEncryptionCAFileInputChange}
              />
            </FormGroup>
            <FormGroup label={t('Server information')} isRequired>
              <TextInput
                placeholder={t('Enter server information')}
                value={state.serverInformation}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_SERVER_INFORMATION', payload: value })
                }
              />
            </FormGroup>
            <FormGroup label={t('Tenant ID')} isRequired>
              <TextInput
                placeholder={t('Enter tenant ID')}
                value={state.tenantId}
                onChange={(_ev, value) =>
                  dispatch({ type: 'SET_TENANT_ID', payload: value })
                }
              />
            </FormGroup>
          </>
        )}
      </FormSection>
      {error && (
        <Alert variant="danger" title={t('Error')} isInline>
          {error}
        </Alert>
      )}
      <ActionGroup>
        <Button isDisabled={loading} isLoading={loading} onClick={onCreate}>
          {t('Create')}
        </Button>
        <Button onClick={() => navigate(-1)} variant="link">
          {t('Cancel')}
        </Button>
      </ActionGroup>
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
