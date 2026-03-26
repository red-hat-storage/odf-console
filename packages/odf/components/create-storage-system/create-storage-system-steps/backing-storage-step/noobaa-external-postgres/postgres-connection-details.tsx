import * as React from 'react';
import { UploadFile } from '@odf/shared/file-handling';
import { PasswordInput } from '@odf/shared/text-inputs';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  FormGroup,
  Checkbox,
  TextInput,
  Form,
  GridItem,
  Grid,
  Content,
  ContentVariants,
  Stack,
} from '@patternfly/react-core';
import { WizardDispatch, WizardState } from '../../../reducer';
import '../backing-storage-step.scss';

const updatePrivateTlsFile = (dispatch: WizardDispatch, file: File) => {
  dispatch({
    type: 'optionalSettings/externalPostgres/tls/keys/setPrivateKey',
    payload: file,
  });
};

const updatePublicTlsFile = (dispatch: WizardDispatch, file: File) => {
  dispatch({
    type: 'optionalSettings/externalPostgres/tls/keys/setPublicKey',
    payload: file,
  });
};

export const PostgresConnectionDetails: React.FC<
  PostgresConnectionDetailsProps
> = ({
  dispatch,
  username,
  password,
  serverName,
  port,
  databaseName,
  tlsEnabled,
  allowSelfSignedCerts,
  enableClientSideCerts,
  tlsFiles,
}) => {
  const { t } = useCustomTranslation();

  const processKeys = React.useCallback(
    (keyFiles: File[]) => {
      if (keyFiles.some((file) => file.name.startsWith('private'))) {
        updatePrivateTlsFile(
          dispatch,
          keyFiles.find((file) => file.name.startsWith('private'))
        );
      } else {
        updatePrivateTlsFile(dispatch, null);
      }

      if (keyFiles.some((file) => file.name.startsWith('public'))) {
        updatePublicTlsFile(
          dispatch,
          keyFiles.find((file) => file.name.startsWith('public'))
        );
      } else {
        updatePublicTlsFile(dispatch, null);
      }
    },
    [dispatch]
  );

  return (
    <Form>
      <Content component={ContentVariants.h4}>
        {t('Connection details')}
      </Content>
      <Grid hasGutter>
        <GridItem span={6}>
          <FormGroup
            label={t('Username')}
            fieldId="external-postgres-username"
            isRequired
          >
            <TextInput
              id="external-postgres-username-input"
              type="text"
              value={username}
              onChange={(_event, newUsername: string) => {
                dispatch({
                  type: 'optionalSettings/externalPostgres/setUsername',
                  payload: newUsername,
                });
              }}
              isRequired
            />
          </FormGroup>
        </GridItem>
        <GridItem span={6} />
        <GridItem span={6}>
          <FormGroup
            label={t('Password')}
            fieldId="external-postgres-password"
            isRequired
          >
            <PasswordInput
              id={'external-postgres-password-input'}
              value={password}
              onChange={(newPassword: string) => {
                dispatch({
                  type: 'optionalSettings/externalPostgres/setPassword',
                  payload: newPassword,
                });
              }}
              isRequired
            />
          </FormGroup>
        </GridItem>
        <GridItem span={6} />
        <GridItem span={5}>
          <FormGroup
            label={t('Server name')}
            fieldId="external-postgres-server-tls"
            isRequired
          >
            <TextInput
              id="external-postgres-server-input"
              type="text"
              value={serverName}
              onChange={(_event, newServer: string) => {
                dispatch({
                  type: 'optionalSettings/externalPostgres/setServerName',
                  payload: newServer,
                });
              }}
              isRequired
            />
          </FormGroup>
        </GridItem>
        <GridItem span={1}>
          <FormGroup
            label={t('Port')}
            fieldId="external-postgres-port"
            isRequired
          >
            <TextInput
              id="external-postgres-port-input"
              type="number"
              value={port}
              onChange={(_event, newPort: string) => {
                dispatch({
                  type: 'optionalSettings/externalPostgres/setPort',
                  payload: newPort,
                });
              }}
              isRequired
            />
          </FormGroup>
        </GridItem>
        <GridItem span={6} />
        <GridItem span={6}>
          <FormGroup
            label={t('Database name')}
            fieldId="external-postgres-database-tls"
            isRequired
          >
            <TextInput
              id="external-postgres-database-input"
              type="text"
              value={databaseName}
              onChange={(_event, newDatabase: string) => {
                dispatch({
                  type: 'optionalSettings/externalPostgres/setDatabaseName',
                  payload: newDatabase,
                });
              }}
              isRequired
            />
          </FormGroup>
        </GridItem>
        <GridItem span={6} />
        <GridItem className="odf-backing-store__tls--margin-top">
          <FormGroup fieldId="external-postgres-enable-tls">
            <Checkbox
              id="external-postgres-enable-tls"
              label={t('Enable TLS/SSL')}
              description={t(
                'Enable this for encrytion on flight with the Postgres server'
              )}
              isChecked={tlsEnabled}
              onChange={() => {
                const isTLSEnabled = !tlsEnabled;
                dispatch({
                  type: 'optionalSettings/externalPostgres/tls/enableTLS',
                  payload: !tlsEnabled,
                });

                dispatch({
                  type: 'optionalSettings/externalPostgres/tls/allowSelfSignedCerts',
                  payload:
                    !isTLSEnabled && allowSelfSignedCerts
                      ? false
                      : allowSelfSignedCerts,
                });

                dispatch({
                  type: 'optionalSettings/externalPostgres/tls/enableClientSideCerts',
                  payload:
                    !isTLSEnabled && enableClientSideCerts
                      ? false
                      : enableClientSideCerts,
                });
              }}
              className="odf-backing-store__radio--margin-bottom"
            />
            {tlsEnabled && (
              <Stack className="odf-backing-store__ssl" hasGutter>
                <Checkbox
                  id="external-postgres-allow-self-signed-certs"
                  label={t('Allow self-signed certificates')}
                  description={t(
                    'Adding this option will allow the postgres server to use a self-signed certificates.'
                  )}
                  isChecked={allowSelfSignedCerts}
                  onChange={() =>
                    dispatch({
                      type: 'optionalSettings/externalPostgres/tls/allowSelfSignedCerts',
                      payload: !allowSelfSignedCerts,
                    })
                  }
                />
                <Checkbox
                  id="external-postgres-enable-client-side-certs"
                  label={t('Enable client-side certificates')}
                  description={t(
                    'Select this option to upload and use your client side certificates'
                  )}
                  isChecked={enableClientSideCerts}
                  onChange={() => {
                    dispatch({
                      type: 'optionalSettings/externalPostgres/tls/enableClientSideCerts',
                      payload: !enableClientSideCerts,
                    });

                    dispatch({
                      type: 'optionalSettings/externalPostgres/tls/keys/setPrivateKey',
                      payload: null,
                    });

                    dispatch({
                      type: 'optionalSettings/externalPostgres/tls/keys/setPublicKey',
                      payload: null,
                    });
                  }}
                />
              </Stack>
            )}
            {enableClientSideCerts && (
              <UploadFile
                acceptedFiles=".pem, .key, .crt"
                infoText={t('Accepted file types: .pem, .crt, .key')}
                titleText={t(
                  'Files should be named private and public followed by compatible extensions'
                )}
                onFileUpload={processKeys}
                uploadLimit={2}
                uploadedFiles={tlsFiles}
                compatibleFileFilter={(file) =>
                  file.name.startsWith('private') ||
                  file.name.startsWith('public')
                }
              />
            )}
          </FormGroup>
        </GridItem>
      </Grid>
    </Form>
  );
};

type PostgresConnectionDetailsProps = {
  dispatch: WizardDispatch;
  username: WizardState['optionalSettings']['externalPostgres']['username'];
  password: WizardState['optionalSettings']['externalPostgres']['password'];
  serverName: WizardState['optionalSettings']['externalPostgres']['serverName'];
  port: WizardState['optionalSettings']['externalPostgres']['port'];
  databaseName: WizardState['optionalSettings']['externalPostgres']['databaseName'];
  tlsEnabled: WizardState['optionalSettings']['externalPostgres']['tls']['enabled'];
  allowSelfSignedCerts: WizardState['optionalSettings']['externalPostgres']['tls']['allowSelfSignedCerts'];
  enableClientSideCerts: WizardState['optionalSettings']['externalPostgres']['tls']['enableClientSideCerts'];
  tlsFiles: File[];
};
