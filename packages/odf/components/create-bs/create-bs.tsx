import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  getAPIVersionForModel,
  k8sCreate,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useHistory } from 'react-router';
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
  BUCKET_LABEL_NOOBAA_MAP,
  NOOBAA_TYPE_MAP,
  PROVIDERS_NOOBAA_MAP,
  StoreType,
} from '../../constants';
import { ODF_MODEL_FLAG } from '../../features';
import { NooBaaBackingStoreModel } from '../../models';
import { MCGPayload } from '../../types';
import {
  getExternalProviders,
  getProviders,
  secretPayloadCreator,
} from '../../utils';
import { GCPEndpointType } from '../mcg-endpoints/gcp-endpoint-type';
import { PVCType } from '../mcg-endpoints/pvc-endpoint-type';
import { S3EndPointType } from '../mcg-endpoints/s3-endpoint-type';
import { providerDataReducer, initialState } from './reducer';
import '../mcg-endpoints/noobaa-provider-endpoints.scss';

const PROVIDERS = getProviders(StoreType.BS);
const externalProviders = getExternalProviders(StoreType.BS);

const CreateBackingStoreForm: React.FC<CreateBackingStoreFormProps> = (
  props
) => {
  const { t } = useCustomTranslation();
  const [bsName, setBsName] = React.useState('');
  const [provider, setProvider] = React.useState(BC_PROVIDERS.AWS);
  const [providerDataState, providerDataDispatch] = React.useReducer(
    providerDataReducer,
    initialState
  );

  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');

  const isODF = useFlag(ODF_MODEL_FLAG);

  const history = useHistory();

  const handleBsNameTextInputChange = (strVal: string) => {
    if (strVal.length <= 43) {
      setBsName(strVal);
    }
  };

  const {
    className,
    isPage,
    appName,
    namespace = CEPH_STORAGE_NAMESPACE,
    onCancel,
    onClose,
  } = props;

  const onSubmit = (event) => {
    event.preventDefault();
    setProgress(true);
    /** Create a secret if secret ==='' */
    let { secretName } = providerDataState;
    const promises = [];
    if (!secretName && provider !== BC_PROVIDERS.PVC) {
      secretName = bsName.concat('-secret');
      const { secretKey, accessKey, gcpJSON } = providerDataState;
      const secretPayload = secretPayloadCreator(
        provider,
        namespace,
        secretName,
        accessKey || gcpJSON,
        secretKey
      );
      providerDataDispatch({ type: 'setSecretName', value: secretName });
      promises.push(k8sCreate({ model: SecretModel, data: secretPayload }));
    }
    /** Payload for bs */
    const bsPayload: MCGPayload = {
      apiVersion: getAPIVersionForModel(NooBaaBackingStoreModel),
      kind: NooBaaBackingStoreModel.kind,
      metadata: {
        namespace,
        name: bsName,
      },
      spec: {
        type: NOOBAA_TYPE_MAP[provider],
        ssl: false,
      },
    };
    if (provider === BC_PROVIDERS.PVC) {
      // eslint-disable-next-line
      bsPayload.spec['pvPool'] = {
        numVolumes: providerDataState.numVolumes,
        storageClass: providerDataState.storageClass,
        resources: {
          requests: {
            storage: providerDataState.volumeSize,
          },
        },
      };
    } else if (externalProviders.includes(provider)) {
      bsPayload.spec = {
        ...bsPayload.spec,
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
      // eslint-disable-next-line
      bsPayload.spec['s3Compatible'] = {
        // eslint-disable-next-line
        ...bsPayload.spec['s3Compatible'],
        endpoint: providerDataState.endpoint,
      };
    } else if (provider === BC_PROVIDERS.IBM) {
      bsPayload.spec.ibmCos = {
        ...bsPayload.spec.ibmCos,
        endpoint: providerDataState.endpoint,
      };
    }
    // Add region in the end
    if (provider === BC_PROVIDERS.AWS) {
      bsPayload.spec.awsS3 = {
        ...bsPayload.spec.awsS3,
        region: providerDataState.region,
      };
    }

    promises.push(
      k8sCreate({ model: NooBaaBackingStoreModel, data: bsPayload })
    );
    return Promise.all(promises)
      .then((resource) => {
        const lastIndex = resource.length - 1;
        const resourcePath = `${referenceForModel(
          NooBaaBackingStoreModel
        )}/${getName(resource[lastIndex])}`;
        if (isPage)
          isODF
            ? history.push(`/odf/resource/${resourcePath}`)
            : history.push(
                `/k8s/ns/${namespace}/clusterserviceversions/${appName}/${resourcePath}`
              );
        else onClose();
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setProgress(false));
  };

  return (
    <Form
      className={classNames('nb-endpoints-form', className)}
      onSubmit={onSubmit}
    >
      <FormGroup
        label={t('BackingStore Name')}
        fieldId="backingstore-name"
        className="nb-endpoints-form-entry"
        helperText={t('A unique name for the BackingStore  within the project')}
        isRequired
      >
        <Tooltip
          content={t('Name can contain a max of 43 characters')}
          isVisible={bsName.length > 42}
          trigger="manual"
        >
          <TextInput
            onChange={handleBsNameTextInputChange}
            value={bsName}
            maxLength={43}
            data-test="backingstore-name"
            placeholder="my-backingstore"
            aria-label={t('BackingStore Name')}
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
          onSelect={(key) => setProvider(key as BC_PROVIDERS)}
          dropdownItems={PROVIDERS}
          defaultSelection={BC_PROVIDERS.AWS}
          data-test="backingstore-provider"
        />
      </FormGroup>
      {provider === BC_PROVIDERS.GCP && (
        <GCPEndpointType
          state={providerDataState}
          dispatch={providerDataDispatch}
          namespace={CEPH_STORAGE_NAMESPACE}
        />
      )}
      {(provider === BC_PROVIDERS.AWS ||
        provider === BC_PROVIDERS.S3 ||
        provider === BC_PROVIDERS.IBM ||
        provider === BC_PROVIDERS.AZURE) && (
        <S3EndPointType
          type={StoreType.BS}
          provider={provider}
          namespace={CEPH_STORAGE_NAMESPACE}
          state={providerDataState}
          dispatch={providerDataDispatch}
        />
      )}
      {provider === BC_PROVIDERS.PVC && (
        <PVCType state={providerDataState} dispatch={providerDataDispatch} />
      )}
      <ButtonBar errorMessage={error} inProgress={inProgress}>
        <ActionGroup>
          <Button
            isDisabled={
              provider === BC_PROVIDERS.PVC && providerDataState.numVolumes < 1
            }
            type="submit"
            data-test="backingstore-create-button"
            variant="primary"
          >
            {t('Create BackingStore')}
          </Button>
          <Button onClick={onCancel} variant="secondary">
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export default CreateBackingStoreForm;

type CreateBackingStoreFormProps = {
  isPage?: boolean;
  namespace?: string;
  className?: string;
  appName?: string;
  onCancel: any;
  onClose?: any;
};
