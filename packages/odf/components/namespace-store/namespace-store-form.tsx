import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { PersistentVolumeClaimModel, SecretModel } from '@odf/shared/models';
import {
  getAPIVersionForModel,
  k8sCreate,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { PersistentVolumeClaimKind, SecretKind } from 'packages/shared/types';
import { useTranslation } from 'react-i18next';
import {
  ActionGroup,
  Button,
  FormGroup,
  Form,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import {
  BC_PROVIDERS,
  NOOBAA_TYPE_MAP,
  PROVIDERS_NOOBAA_MAP,
  BUCKET_LABEL_NOOBAA_MAP,
  StoreType,
} from '../../constants';
import { NooBaaNamespaceStoreModel } from '../../models';
import { NamespaceStoreKind } from '../../types';
import {
  getExternalProviders,
  getProviders,
  secretPayloadCreator,
} from '../../utils';
import { S3EndPointType } from '../mcg-endpoints/s3-endpoint-type';
import { initialState, providerDataReducer } from './reducer';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const PROVIDERS = getProviders(StoreType.NS);
const externalProviders = getExternalProviders(StoreType.NS);

type Payload = K8sResourceCommon & {
  spec: {
    type: string;
    ssl: boolean;
    [key: string]: any;
  };
};

type NamespaceStoreFormProps = {
  redirectHandler: (resources?: (NamespaceStoreKind | SecretKind)[]) => void;
  namespace: string;
  className?: string;
  onCancel: () => void;
};

const NamespaceStoreForm: React.FC<NamespaceStoreFormProps> = (props) => {
  const { t } = useTranslation();
  const [nsName, setNsName] = React.useState('');
  const [provider, setProvider] = React.useState(BC_PROVIDERS.AWS);
  const [pvc, setPVC] = React.useState(null);
  const [folderName, setFolderName] = React.useState('');
  const [providerDataState, providerDataDispatch] = React.useReducer(
    providerDataReducer,
    initialState
  );

  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleNsNameTextInputChange = (strVal: string) => setNsName(strVal);
  const { onCancel, className, redirectHandler, namespace } = props;

  const onSubmit = (event) => {
    event.preventDefault();
    setProgress(true);
    /** Create a secret if secret ==='' */
    let { secretName } = providerDataState;
    const promises = [];
    if (!secretName) {
      secretName = nsName.concat('-secret');
      const { secretKey, accessKey } = providerDataState;
      const secretPayload = secretPayloadCreator(
        provider,
        namespace,
        secretName,
        accessKey,
        secretKey
      );
      providerDataDispatch({ type: 'setSecretName', value: secretName });
      promises.push(k8sCreate({ model: SecretModel, data: secretPayload }));
    }
    /** Payload for ns */
    const nsPayload: Payload = {
      apiVersion: getAPIVersionForModel(NooBaaNamespaceStoreModel as any),
      kind: NooBaaNamespaceStoreModel.kind,
      metadata: {
        namespace,
        name: nsName,
      },
      spec: {
        type: NOOBAA_TYPE_MAP[provider],
        ssl: false,
      },
    };
    if (externalProviders.includes(provider)) {
      nsPayload.spec = {
        ...nsPayload.spec,
        [PROVIDERS_NOOBAA_MAP[provider]]: {
          [BUCKET_LABEL_NOOBAA_MAP[provider]]: providerDataState.target,
          secret: {
            name: secretName,
            namespace,
          },
        },
      };
    }
    if (provider === BC_PROVIDERS.S3) {
      nsPayload.spec.s3Compatible = {
        ...nsPayload.spec.s3Compatible,
        endpoint: providerDataState.endpoint,
      };
    } else if (provider === BC_PROVIDERS.IBM) {
      nsPayload.spec.ibmCos = {
        ...nsPayload.spec.ibmCos,
        endpoint: providerDataState.endpoint,
      };
    }
    // Add region in the end
    if (provider === BC_PROVIDERS.AWS) {
      nsPayload.spec.awsS3 = {
        ...nsPayload.spec.awsS3,
        region: providerDataState.region,
      };
    }
    if (provider === BC_PROVIDERS.FILESYSTEM) {
      nsPayload.spec.nsfs = {
        ...nsPayload.spec.nsfs,
        pvcName: pvc,
        subPath: folderName,
      };
    }
    promises.push(
      k8sCreate({ model: NooBaaNamespaceStoreModel, data: nsPayload })
    );

    Promise.all(promises)
      .then((resources: (NamespaceStoreKind | SecretKind)[]) => {
        redirectHandler(resources);
      })
      .catch((error) => {
        setError(error.message);
      })
      .finally(() => {
        setProgress(false);
      });
  };

  return (
    <Form
      className={classNames('nb-endpoints-form', 'co-m-pane__body', className)}
      onSubmit={onSubmit}
      noValidate={false}
    >
      <FormGroup
        label={t('Namespace store name')}
        fieldId="namespacestore-name"
        className="nb-endpoints-form-entry"
        helperText={t(
          'A unique name for the namespace store within the project'
        )}
        isRequired
      >
        <Tooltip
          content={t('Name can contain a max of 43 characters')}
          isVisible={nsName.length > 42}
          trigger="manual"
        >
          <TextInput
            id="ns-name"
            onChange={handleNsNameTextInputChange}
            value={nsName}
            maxLength={43}
            data-test="namespacestore-name"
            placeholder="my-namespacestore"
          />
        </Tooltip>
      </FormGroup>

      <FormGroup
        label={t('Provider')}
        fieldId="provider-name"
        className="nb-endpoints-form-entry"
        isRequired
      >
        <StaticDropdown
          className="nb-endpoints-form-entry__dropdown"
          onSelect={setProvider as any}
          dropdownItems={PROVIDERS}
          defaultSelection={provider}
        />
      </FormGroup>
      {(provider === BC_PROVIDERS.AWS ||
        provider === BC_PROVIDERS.S3 ||
        provider === BC_PROVIDERS.IBM ||
        provider === BC_PROVIDERS.AZURE) && (
        <S3EndPointType
          type={StoreType.NS}
          provider={provider}
          namespace={CEPH_STORAGE_NAMESPACE}
          state={providerDataState}
          dispatch={providerDataDispatch}
        />
      )}
      {provider === BC_PROVIDERS.FILESYSTEM && (
        <>
          <FormGroup
            label={t('Persistent volume claim')}
            fieldId="pvc-name"
            className="nb-endpoints-form-entry"
            isRequired
          >
            <ResourceDropdown<PersistentVolumeClaimKind>
              id="pvc-name"
              resourceModel={PersistentVolumeClaimModel}
              resource={{
                kind: PersistentVolumeClaimModel.kind,
                isList: true,
                namespace,
              }}
              onSelect={setPVC}
              filterResource={(pvcObj: PersistentVolumeClaimKind) =>
                pvcObj?.status?.phase === 'Bound' &&
                pvcObj?.spec?.accessModes.some(
                  (mode) => mode === 'ReadWriteMany'
                )
              }
            />
          </FormGroup>
          <FormGroup
            label={t('Folder')}
            fieldId="folder-name"
            className="nb-endpoints-form-entry"
            helperText={t(
              'If the name you write exists, we will be using the existing folder if not we will create a new folder '
            )}
            isRequired
          >
            <TextInput
              id="folder-name"
              onChange={setFolderName}
              value={folderName}
              data-test="folder-name"
              placeholder="Please enter the folder name"
            />
          </FormGroup>
        </>
      )}
      <ButtonBar errorMessage={error} inProgress={inProgress}>
        <ActionGroup>
          <Button
            type="submit"
            data-test="namespacestore-create-button"
            variant="primary"
          >
            {t('Create')}
          </Button>
          <Button onClick={onCancel} variant="secondary">
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export default NamespaceStoreForm;
