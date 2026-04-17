import * as React from 'react';
import { getRBDVolumeSnapshotClassName } from '@odf/core/components/utils';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { RHCSState } from '@odf/core/types';
import { hasAnyInternalOCS, labelOCSNamespace } from '@odf/core/utils';
import {
  inTransitEncryptionSettingsForRHCS,
  PageHeading,
  TechPreviewBadge,
  useCustomTranslation,
  useK8sList,
} from '@odf/shared';
import { DOC_VERSION as odfDocVersion } from '@odf/shared/hooks';
import { NamespaceModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { k8sCreate, K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  TextContent,
  TextVariants,
  Text,
  Checkbox,
  Alert,
  AlertVariant,
  Button,
  FlexItem,
  Flex,
  ButtonVariant,
} from '@patternfly/react-core';
import { AutomaticBackup } from '../../create-storage-system-steps/advanced-settings-step/automatic-backup/automatic-backup';
import { PostgresConnectionDetails } from '../../create-storage-system-steps/backing-storage-step/noobaa-external-postgres/postgres-connection-details';
import { SetCephRBDStorageClassDefault } from '../../create-storage-system-steps/backing-storage-step/set-rbd-sc-default';
import { createOCSNamespace } from '../../payloads';
import { CreateStorageSystemAction } from '../../reducer';
import {
  ConnectionDetails,
  rhcsPayload,
} from './CephConnectionDetails/system-connection-details';

// Define the action types for the reducer
type RHCSAction =
  | { type: 'SET_FILE_DATA'; payload: string }
  | { type: 'SET_ERROR_MESSAGE'; payload: string }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_FILE_NAME'; payload: string }
  | { type: 'SET_FIELD'; payload: { key: keyof RHCSState; value: any } };

// Initial state for the reducer
const initialState: RHCSState = {
  fileData: '',
  errorMessage: '',
  isLoading: false,
  fileName: '',
};

// Reducer function
const reducer = (state: RHCSState, action: RHCSAction): RHCSState => {
  switch (action.type) {
    case 'SET_FILE_DATA':
      return { ...state, fileData: action.payload };
    case 'SET_ERROR_MESSAGE':
      return { ...state, errorMessage: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_FILE_NAME':
      return { ...state, fileName: action.payload };
    case 'SET_FIELD':
      return { ...state, [action.payload.key]: action.payload.value };
    default:
      return state;
  }
};

// Custom dispatch function type that matches ConnectionDetails expectations
type RHCSDispatch = (key: keyof RHCSState, value: any) => void;

// Not to be exposed to other files to make our code name agnostic
const OCS_EXTERNAL_CR_NAME = 'ocs-external-storagecluster';
const OCS_MULTIPLE_CLUSTER_NS = 'openshift-storage-extended';

const NOOBAA_DB_BACKUP_VOLUMESNAPSHOTCLASS =
  getRBDVolumeSnapshotClassName(OCS_EXTERNAL_CR_NAME);

// Initial state for advanced settings (backup + postgres)
type AdvancedSettingsState = {
  isDbBackup: boolean;
  dbBackup: {
    schedule: string;
    volumeSnapshot: {
      maxSnapshots: number;
      volumeSnapshotClass: string;
    };
  };
  useExternalPostgres: boolean;
  externalPostgres: {
    username: string;
    password: string;
    serverName: string;
    port: string;
    databaseName: string;
    tls: {
      enabled: boolean;
      allowSelfSignedCerts: boolean;
      enableClientSideCerts: boolean;
      keys: {
        private: File;
        public: File;
      };
    };
  };
};

const initialAdvancedSettingsState: AdvancedSettingsState = {
  isDbBackup: false,
  dbBackup: {
    schedule: '0 0 * * *',
    volumeSnapshot: {
      maxSnapshots: 5,
      volumeSnapshotClass: '',
    },
  },
  useExternalPostgres: false,
  externalPostgres: {
    username: '',
    password: '',
    serverName: '',
    port: null,
    databaseName: '',
    tls: {
      enabled: false,
      allowSelfSignedCerts: false,
      enableClientSideCerts: false,
      keys: {
        private: null,
        public: null,
      },
    },
  },
};

// Reducer for advanced settings
const advancedSettingsReducer = (
  state: AdvancedSettingsState,
  action: CreateStorageSystemAction
): AdvancedSettingsState => {
  switch (action.type) {
    // Backup actions
    case 'advancedSettings/setDbBackup':
      return { ...state, isDbBackup: action.payload };
    case 'advancedSettings/dbBackup/schedule':
      return {
        ...state,
        dbBackup: { ...state.dbBackup, schedule: action.payload },
      };
    case 'advancedSettings/dbBackup/volumeSnapshot/maxSnapshots':
      return {
        ...state,
        dbBackup: {
          ...state.dbBackup,
          volumeSnapshot: {
            ...state.dbBackup.volumeSnapshot,
            maxSnapshots: action.payload,
          },
        },
      };
    case 'advancedSettings/dbBackup/volumeSnapshot/volumeSnapshotClass':
      return {
        ...state,
        dbBackup: {
          ...state.dbBackup,
          volumeSnapshot: {
            ...state.dbBackup.volumeSnapshot,
            volumeSnapshotClass: action.payload,
          },
        },
      };
    // Postgres actions
    case 'advancedSettings/useExternalPostgres':
      return { ...state, useExternalPostgres: action.payload };
    case 'advancedSettings/externalPostgres/setUsername':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          username: action.payload,
        },
      };
    case 'advancedSettings/externalPostgres/setPassword':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          password: action.payload,
        },
      };
    case 'advancedSettings/externalPostgres/setServerName':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          serverName: action.payload,
        },
      };
    case 'advancedSettings/externalPostgres/setPort':
      return {
        ...state,
        externalPostgres: { ...state.externalPostgres, port: action.payload },
      };
    case 'advancedSettings/externalPostgres/setDatabaseName':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          databaseName: action.payload,
        },
      };
    case 'advancedSettings/externalPostgres/tls/enableTLS':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          tls: {
            ...state.externalPostgres.tls,
            enabled: action.payload,
          },
        },
      };
    case 'advancedSettings/externalPostgres/tls/allowSelfSignedCerts':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          tls: {
            ...state.externalPostgres.tls,
            allowSelfSignedCerts: action.payload,
          },
        },
      };
    case 'advancedSettings/externalPostgres/tls/enableClientSideCerts':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          tls: {
            ...state.externalPostgres.tls,
            enableClientSideCerts: action.payload,
          },
        },
      };
    case 'advancedSettings/externalPostgres/tls/keys/setPrivateKey':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          tls: {
            ...state.externalPostgres.tls,
            keys: {
              ...state.externalPostgres.tls.keys,
              private: action.payload,
            },
          },
        },
      };
    case 'advancedSettings/externalPostgres/tls/keys/setPublicKey':
      return {
        ...state,
        externalPostgres: {
          ...state.externalPostgres,
          tls: {
            ...state.externalPostgres.tls,
            keys: {
              ...state.externalPostgres.tls.keys,
              public: action.payload,
            },
          },
        },
      };
    default:
      return state;
  }
};
const CreateCephCluster: React.FC = () => {
  const { t } = useCustomTranslation();
  const { odfNamespace, isNsSafe } = useODFNamespaceSelector();
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [encryption, setEncryption] = React.useState(false);
  const [isRBDStorageClassDefault, setRBDStorageClassDefault] =
    React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  // Single reducer for advanced settings (backup + postgres)
  const [advancedSettings, advancedDispatch] = React.useReducer(
    advancedSettingsReducer,
    initialAdvancedSettingsState
  );

  const { isDbBackup, dbBackup, useExternalPostgres, externalPostgres } =
    advancedSettings;

  const navigate = useNavigate();
  const redirectPath = '/odf/external-systems';

  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();

  const [namespaces] = useK8sList(NamespaceModel);

  const hasInternal =
    areFlagsLoaded && !flagsLoadError ? hasAnyInternalOCS(systemFlags) : false;

  // Create a dispatch function that matches the expected interface
  const setFormState: RHCSDispatch = React.useCallback((key, value) => {
    dispatch({ type: 'SET_FIELD', payload: { key, value } });
  }, []);
  const onSubmit = async () => {
    setIsLoading(true);

    try {
      const systemNamespace = !hasInternal
        ? odfNamespace
        : OCS_MULTIPLE_CLUSTER_NS;
      const nsAlreadyExists = !!(namespaces ?? []).find(
        (ns) => getName(ns) === systemNamespace
      );
      systemNamespace === odfNamespace || nsAlreadyExists
        ? await labelOCSNamespace(systemNamespace)
        : await createOCSNamespace(systemNamespace);

      const payload = rhcsPayload({
        systemName: OCS_EXTERNAL_CR_NAME,
        state,
        namespace: systemNamespace,
        inTransitStatus: encryption,
        shouldSetCephRBDAsDefault: isRBDStorageClassDefault,
        isDbBackup,
        dbBackup: isDbBackup
          ? {
              ...dbBackup,
              volumeSnapshot: {
                ...dbBackup.volumeSnapshot,
                // Auto-set volumeSnapshotClass for external mode (isMCG=false)
                volumeSnapshotClass: NOOBAA_DB_BACKUP_VOLUMESNAPSHOTCLASS,
              },
            }
          : undefined,
      });

      const promises = payload.map((p) =>
        k8sCreate({ model: p.model as K8sModel, data: p.payload })
      );
      await Promise.all(promises);
      navigate(redirectPath);
    } catch (e) {
      setError(e?.message ?? JSON.stringify(e));
    }
    setIsLoading(false);
  };

  return (
    <>
      <PageHeading title={t('Connect Red Hat Ceph storage')}>
        <TextContent>
          <Text component={TextVariants.small}>
            {t(
              'Connect to a Red Hat Ceph cluster to unify and scale your block, file, and object storage with Data Foundation'
            )}
          </Text>
        </TextContent>
      </PageHeading>
      <div className="odf-m-pane__body">
        <TextContent>
          <Text component={TextVariants.h3}>
            {t('Configure connection network')}
          </Text>
        </TextContent>
        <div>
          <ConnectionDetails setFormState={setFormState} formState={state} />
        </div>
        <div className="pf-v5-u-mt-lg">
          <TextContent>
            <Text component={TextVariants.h3}>{t('Encryption')}</Text>
          </TextContent>
          <Checkbox
            className="pf-v5-u-mt-md"
            data-test="in-transit-encryption-checkbox"
            id="in-transit-encryption"
            isChecked={encryption}
            data-checked-state={encryption}
            label={t('In-transit encryption')}
            description={t(
              'Encrypts all Ceph traffic including data, using Ceph msgrv2'
            )}
            onChange={(_event, checked: boolean) => setEncryption(checked)}
          />
          <Alert
            variant={AlertVariant.info}
            isInline
            className="pf-v5-u-mt-sm"
            title={
              <>
                {t(
                  'Verify your RHCS cluster has the necessary in-transit encryption settings configured to enable in-transit encryption on your external cluster. Refer to the documentation for detailed configuration steps.'
                )}{' '}
                <a
                  href={inTransitEncryptionSettingsForRHCS(odfDocVersion)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Documentation link')}
                </a>
              </>
            }
          />
        </div>
        <div className="pf-v5-u-mt-lg">
          <TextContent>
            <Text component={TextVariants.h3}>
              {t('Advanced configuration')}
            </Text>
          </TextContent>
          <SetCephRBDStorageClassDefault
            className="pf-v5-u-mt-md"
            dispatch={() =>
              setRBDStorageClassDefault((currState) => !currState)
            }
            isRBDStorageClassDefault={isRBDStorageClassDefault}
          />
          <Checkbox
            id="use-external-postgress"
            label={
              <>
                {t('Use external PostgreSQL')}
                <span className="pf-v5-u-ml-sm">
                  <TechPreviewBadge />
                </span>
              </>
            }
            description={t(
              'Allow Noobaa to connect to an external postgres server'
            )}
            isChecked={useExternalPostgres}
            onChange={(_event, checked: boolean) =>
              advancedDispatch({
                type: 'advancedSettings/useExternalPostgres',
                payload: checked,
              })
            }
            className="odf-backing-store__radio--margin-bottom"
            isDisabled={isDbBackup}
          />
          {useExternalPostgres && (
            <PostgresConnectionDetails
              dispatch={advancedDispatch}
              tlsFiles={[
                externalPostgres.tls.keys.private,
                externalPostgres.tls.keys.public,
              ]}
              tlsEnabled={externalPostgres.tls.enabled}
              allowSelfSignedCerts={externalPostgres.tls.allowSelfSignedCerts}
              username={externalPostgres.username}
              password={externalPostgres.password}
              serverName={externalPostgres.serverName}
              databaseName={externalPostgres.databaseName}
              port={externalPostgres.port}
              enableClientSideCerts={externalPostgres.tls.enableClientSideCerts}
            />
          )}
          <div className="pf-v5-u-my-md">
            <AutomaticBackup
              dispatch={advancedDispatch}
              isDbBackup={isDbBackup}
              isMCG={false}
              dbBackup={dbBackup}
              isExternalPostgresEnabled={useExternalPostgres}
            />
          </div>
        </div>
        {error && (
          <Alert variant={AlertVariant.danger} isInline title={error} />
        )}
        <Flex direction={{ default: 'row' }}>
          <FlexItem>
            <Button
              isLoading={isLoading}
              spinnerAriaLabel={t('Connecting')}
              onClick={onSubmit}
              variant={ButtonVariant.primary}
              isDisabled={isLoading || _.isEmpty(state.fileData) || !isNsSafe}
            >
              {isLoading ? t('Connecting') : t('Connect')}
            </Button>
          </FlexItem>
          <FlexItem>
            <Button onClick={() => navigate(-1)} variant={ButtonVariant.link}>
              {t('Cancel')}
            </Button>
          </FlexItem>
        </Flex>
      </div>
    </>
  );
};

export default CreateCephCluster;
