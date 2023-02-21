import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import fieldRequirementsTranslations from '@odf/shared/constants/fieldRequirements';
import ResourceDropdown from '@odf/shared/dropdown/ResourceDropdown';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { PersistentVolumeClaimModel, SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { PersistentVolumeClaimKind, SecretKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import {
  getAPIVersionForModel,
  k8sCreate,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
  ActionGroup,
  Button,
  FormGroup,
  Form,
  TextInput,
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
import validationRegEx from '../../utils/validation';
import { S3EndPointType } from '../mcg-endpoints/s3-endpoint-type';
import {
  initialState,
  providerDataReducer,
  ProviderDataState,
  StoreAction,
} from './reducer';
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

const createSecret = async (
  dataSourceName: string,
  namespace: string,
  provider: BC_PROVIDERS,
  providerDataState: ProviderDataState,
  providerDataDispatch: React.Dispatch<StoreAction>
) => {
  const { secretKey, accessKey } = providerDataState;
  let createdSecret: SecretKind;
  let secretName = dataSourceName.concat('-secret');
  const secretPayload = secretPayloadCreator(
    provider,
    namespace,
    secretName,
    accessKey,
    secretKey
  );
  try {
    createdSecret = (await k8sCreate({
      model: SecretModel,
      data: secretPayload,
    })) as SecretKind;
  } catch {
    secretName = dataSourceName.concat('-');
    const newSecretPayload = {
      ...secretPayload,
      metadata: {
        generateName: secretName,
        namespace: secretPayload.metadata.namespace,
      },
    };
    createdSecret = (await k8sCreate({
      model: SecretModel,
      data: newSecretPayload,
    })) as SecretKind;
  } finally {
    secretName = createdSecret?.metadata?.name;
    providerDataDispatch({ type: 'setSecretName', value: secretName });
  }
  return secretName;
};

const NamespaceStoreForm: React.FC<NamespaceStoreFormProps> = (props) => {
  const { t } = useCustomTranslation();
  const [provider, setProvider] = React.useState(BC_PROVIDERS.AWS);
  const [pvc, setPVC] = React.useState<PersistentVolumeClaimKind>(null);
  const [folderName, setFolderName] = React.useState('');
  const [providerDataState, providerDataDispatch] = React.useReducer(
    providerDataReducer,
    initialState
  );

  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');

  const { onCancel, className, redirectHandler, namespace } = props;

  const [data, loaded, loadError] = useK8sList<NamespaceStoreKind>(
    NooBaaNamespaceStoreModel,
    namespace
  );

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((data) => getName(data)) : [];

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 43),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.uniqueName(t, 'NamespaceStore'),
    ];

    const schema = Yup.object({
      'ns-name': Yup.string()
        .required()
        .max(43, fieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[2]
        )
        .test(
          'unique-name',
          fieldRequirements[3],
          (value: string) => !existingNames.includes(value)
        ),
    });

    return { schema, fieldRequirements };
  }, [data, loadError, loaded, t]);

  const resolver = useYupValidationResolver(schema);
  const { control, handleSubmit } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver,
    context: undefined,
    criteriaMode: 'firstError',
    shouldFocusError: true,
    shouldUnregister: false,
    shouldUseNativeValidation: false,
    delayError: undefined,
  });

  const onSubmit = async (values, event) => {
    event.preventDefault();
    setProgress(true);
    try {
      const nsName = values['ns-name'];
      let { secretName } = providerDataState;
      if (!secretName) {
        /** Create a secret if secret ==='' */
        secretName = await createSecret(
          nsName,
          namespace,
          provider,
          providerDataState,
          providerDataDispatch
        );
      }
      /** Payload for nss */
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
      switch (provider) {
        case BC_PROVIDERS.S3:
          nsPayload.spec.s3Compatible = {
            ...nsPayload.spec.s3Compatible,
            endpoint: providerDataState.endpoint,
          };
          break;
        case BC_PROVIDERS.IBM:
          nsPayload.spec.ibmCos = {
            ...nsPayload.spec.ibmCos,
            endpoint: providerDataState.endpoint,
          };
          break;
        case BC_PROVIDERS.AWS:
          nsPayload.spec.awsS3 = {
            ...nsPayload.spec.awsS3,
            region: providerDataState.region,
          };
          break;
        case BC_PROVIDERS.FILESYSTEM:
          nsPayload.spec.nsfs = {
            ...nsPayload.spec.nsfs,
            pvcName: getName(pvc),
            subPath: folderName,
          };
          break;
      }

      const resources = await k8sCreate({
        model: NooBaaNamespaceStoreModel,
        data: nsPayload,
      });
      redirectHandler([resources]);
    } catch (error) {
      setError(error.message);
    } finally {
      setProgress(false);
    }
  };

  return (
    <Form
      className={classNames('nb-endpoints-form', 'co-m-pane__body', className)}
      onSubmit={handleSubmit(onSubmit)}
      noValidate={false}
    >
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-namespacestore`,
        }}
        formGroupProps={{
          label: t('Namespace store name'),
          fieldId: 'namespacestore-name',
          className: 'nb-endpoints-form-entry',
          helperText: t(
            'A unique name for the NamespaceStore within the project'
          ),
          isRequired: true,
        }}
        textInputProps={{
          id: 'ns-name',
          name: 'ns-name',
          'data-test': 'namespacestore-name',
          placeholder: 'my-namespacestore',
        }}
      />

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
          data-test="namespacestore-provider"
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
