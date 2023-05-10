import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import StaticDropdown from '@odf/shared/dropdown/StaticDropdown';
import { FormGroupController } from '@odf/shared/form-group-controller';
import { ButtonBar } from '@odf/shared/generic/ButtonBar';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { SecretModel } from '@odf/shared/models';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import {
  getAPIVersionForModel,
  k8sCreate,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import { useForm } from 'react-hook-form';
import { useHistory } from 'react-router';
import * as Yup from 'yup';
import { ActionGroup, Alert, Button, Form } from '@patternfly/react-core';
import {
  BC_PROVIDERS,
  BUCKET_LABEL_NOOBAA_MAP,
  NOOBAA_TYPE_MAP,
  PROVIDERS_NOOBAA_MAP,
  StoreType,
  providerSchema,
} from '../../constants';
import { ODF_MODEL_FLAG } from '../../features';
import { NooBaaBackingStoreModel } from '../../models';
import { BackingStoreKind, MCGPayload } from '../../types';
import {
  getExternalProviders,
  getProviders,
  secretPayloadCreator,
} from '../../utils';
import validationRegEx from '../../utils/validation';
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
  const [providerDataState, providerDataDispatch] = React.useReducer(
    providerDataReducer,
    initialState
  );

  const [inProgress, setProgress] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showSecret, setShowSecret] = React.useState(true);

  const isODF = useFlag(ODF_MODEL_FLAG);

  const history = useHistory();

  const {
    className,
    isPage,
    appName,
    namespace = CEPH_STORAGE_NAMESPACE,
    onCancel,
    onClose,
  } = props;

  const [data, loaded, loadError] = useK8sList<BackingStoreKind>(
    NooBaaBackingStoreModel,
    namespace
  );

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((dataItem) => getName(dataItem)) : [];

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 43),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.uniqueName(t, 'BackingStore'),
    ];

    const baseSchema = Yup.object({
      'backingstore-name': Yup.string()
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

    const schema = baseSchema.concat(providerSchema(showSecret));

    return { schema, fieldRequirements };
  }, [data, loadError, loaded, showSecret, t]);

  const resolver = useYupValidationResolver(schema);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitted },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const provider = watch('provider-name');

  const onSubmit = (values, event) => {
    event.preventDefault();
    setProgress(true);
    const bsName = values['backingstore-name'];
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
      onSubmit={handleSubmit(onSubmit)}
    >
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-backingstore`,
        }}
        formGroupProps={{
          label: t('BackingStore Name'),
          fieldId: 'backingstore-name',
          className: 'nb-endpoints-form-entry',
          isRequired: true,
        }}
        textInputProps={{
          name: 'backingstore-name',
          placeholder: 'my-backingstore',
          'data-test': 'backingstore-name',
          'aria-label': t('BackingStore Name'),
        }}
      />

      <FormGroupController
        name="provider-name"
        control={control}
        defaultValue={BC_PROVIDERS.AWS}
        formGroupProps={{
          label: t('Provider'),
          fieldId: 'provider-name',
          className: 'nb-endpoints-form-entry',
          isRequired: true,
        }}
        render={({ value, onChange, onBlur }) => (
          <StaticDropdown
            className="nb-endpoints-form-entry__dropdown"
            onSelect={onChange}
            onBlur={onBlur}
            dropdownItems={PROVIDERS}
            defaultSelection={value}
            data-test="backingstore-provider"
          />
        )}
      />
      {provider === BC_PROVIDERS.GCP && (
        <GCPEndpointType
          control={control}
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
          showSecret={showSecret}
          setShowSecret={setShowSecret}
          control={control}
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
      {!isValid && isSubmitted && (
        <Alert
          variant="danger"
          isInline
          title={t('Address form errors to proceed')}
        />
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
