import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { DiskSize, KMSMaxFileUploadSize } from '@odf/core/constants';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { StorageQuota } from '@odf/core/types';
import {
  ButtonBar,
  ConfigMapKind,
  ConfigMapModel,
  FieldLevelHelp,
  fieldRequirementsTranslations,
  formSettings,
  getName,
  ResourceDropdown,
  StorageConsumerKind,
  StorageConsumerModel,
  StorageConsumerState,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useDeepCompareMemoize,
  useYupValidationResolver,
} from '@odf/shared';
import { getRandomChars, getValidatedProp } from '@odf/shared/utils';
import validationRegEx from '@odf/shared/utils/validation';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import * as Yup from 'yup';
import {
  Form,
  Content,
  ContentVariants,
  ActionGroup,
  Button,
  Radio,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  FileUpload,
  Title,
} from '@patternfly/react-core';
import { StorageQuotaBody } from './onboarding-modal';

const unlimitedQuota: StorageQuota = {
  value: 0,
  unit: null,
};

// auth.go reads configmap data["ca.crt"].
const CLIENT_CA_CONFIGMAP_KEY = 'ca.crt';

type ClientCAFile = {
  value: string;
  fileName: string;
  error: string;
};

const emptyClientCAFile: ClientCAFile = {
  value: '',
  fileName: '',
  error: '',
};

const clientCAConfigMapNameFor = (consumerName: string) => {
  const suffix = `-client-ca-${getRandomChars()}`;
  return `${consumerName.slice(0, 253 - suffix.length)}${suffix}`;
};

const storageConsumerResource: WatchK8sResource = {
  groupVersionKind: {
    group: StorageConsumerModel.apiGroup,
    kind: StorageConsumerModel.kind,
    version: StorageConsumerModel.apiVersion,
  },
  isList: true,
};

const useStorageConsumerFormSchema = () => {
  const { t } = useCustomTranslation();
  const [data] = useK8sWatchResource<StorageConsumerKind[]>(
    storageConsumerResource
  );
  const unmemoizedNames = data?.map(getName);
  const names = useDeepCompareMemoize(unmemoizedNames, true);

  return React.useMemo(() => {
    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBeforeInNamespace(t),
      fieldRequirementsTranslations.cannotBeEmpty(t),
    ];
    const nameSchema = Yup.object({
      storageconsumerName: Yup.string()
        .max(253, fieldRequirements[0])
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
          (value: string) => !names.includes(value)
        )
        .matches(validationRegEx.nonEmptyString, fieldRequirements[4]),
    });
    return { formSchema: nameSchema, fieldRequirements };
  }, [names, t]);
};

const filterStorageConsumerResource = (resource: StorageConsumerKind) =>
  resource.status?.state === StorageConsumerState.Ready;

const CreateStorageConsumer: React.FC = () => {
  const [name, setName] = React.useState('');
  const [progress, setProgress] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [quota, setQuota] = React.useState<StorageQuota>(unlimitedQuota);
  const [isBackedByConsumer, setIsBackedByConsumer] = React.useState(false);
  const [backingStorageConsumer, setBackingStorageConsumer] =
    React.useState<StorageConsumerKind>(null);
  const [clientCAFile, setClientCAFile] =
    React.useState<ClientCAFile>(emptyClientCAFile);
  const [clientSAN, setClientSAN] = React.useState('');

  const { odfNamespace } = useODFNamespaceSelector();

  const flags = useODFSystemFlagsSelector();
  const clusterName = flags?.systemFlags?.[odfNamespace]?.odfSystemName;

  const navigate = useNavigate();

  const { formSchema, fieldRequirements } = useStorageConsumerFormSchema();
  const resolver = useYupValidationResolver(formSchema);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm({
    ...formSettings,
    resolver,
  });
  const { t } = useCustomTranslation();

  const storageConsumerName = watch('storageconsumerName');
  React.useEffect(() => {
    setName(storageConsumerName);
  }, [storageConsumerName, setName]);

  const clearClientCA = () => {
    setClientCAFile(emptyClientCAFile);
  };

  const readClientCA = (file?: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setClientCAFile({
        value: String(reader.result ?? '').trim(),
        fileName: file?.name || '',
        error: '',
      });
    };
    reader.onerror = () => {
      setClientCAFile({
        value: '',
        fileName: file?.name || '',
        error: t('File read failed. Please try again.'),
      });
    };
    if (file) {
      setClientCAFile({ ...emptyClientCAFile, fileName: file.name });
      reader.readAsText(file, 'UTF-8');
    } else {
      clearClientCA();
    }
  };

  const hasClientCA = !!clientCAFile.value.trim();
  const hasClientSAN = !!clientSAN.trim();
  const authIncomplete = hasClientCA !== hasClientSAN;

  const onSubmit = async (_unused, event) => {
    event.preventDefault();
    const certificate = clientCAFile.value.trim();
    const san = clientSAN.trim();
    if (clientCAFile.error || authIncomplete) {
      return;
    }
    const quotaInGib: number = (() => {
      if (quota.unit === DiskSize.Gi) {
        return Number(quota.value);
      } else {
        return Number(quota.value) * 1024;
      }
    })();
    const resourceNameMappingCM =
      backingStorageConsumer?.status?.resourceNameMappingConfigMap;
    setProgress(true);
    setError(null);
    let clientCAConfigMapName: string | undefined;
    try {
      // Provider auth skips verification unless both the CA configmap and SAN are set.
      if (certificate && san) {
        const configMap = await k8sCreate<ConfigMapKind>({
          model: ConfigMapModel,
          data: {
            apiVersion: ConfigMapModel.apiVersion,
            kind: ConfigMapModel.kind,
            metadata: {
              name: clientCAConfigMapNameFor(name),
              namespace: odfNamespace,
            },
            data: {
              [CLIENT_CA_CONFIGMAP_KEY]: certificate,
            },
          },
        });
        clientCAConfigMapName = getName(configMap);
      }

      await k8sCreate<StorageConsumerKind>({
        model: StorageConsumerModel,
        data: {
          apiVersion: getAPIVersionForModel(StorageConsumerModel),
          kind: StorageConsumerModel.kind,
          metadata: {
            name,
            namespace: odfNamespace,
          },
          spec: {
            resourceNameMappingConfigMap: resourceNameMappingCM,
            storageQuotaInGiB: quotaInGib,
            storageClasses: [
              { name: `${clusterName}-ceph-rbd` },
              { name: `${clusterName}-cephfs` },
              { name: `${odfNamespace}.noobaa.io` },
            ],
            volumeSnapshotClasses: [
              { name: `${clusterName}-rbdplugin-snapclass` },
              { name: `${clusterName}-cephfsplugin-snapclass` },
            ],
            ...(clientCAConfigMapName
              ? {
                  clientCAConfigMap: { name: clientCAConfigMapName },
                  clientSAN: san,
                }
              : {}),
          },
        },
      });
      setProgress(false);
      navigate(-1);
    } catch (err) {
      if (clientCAConfigMapName) {
        k8sDelete({
          model: ConfigMapModel,
          resource: {
            metadata: {
              name: clientCAConfigMapName,
              namespace: odfNamespace,
            },
          },
        }).catch(() => undefined);
      }
      setProgress(false);
      setError(err?.message || err);
    }
  };

  const exampleTranslatedText = t('Example');

  const isDisabled =
    (isBackedByConsumer && _.isEmpty(backingStorageConsumer)) ||
    !isValid ||
    !!clientCAFile.error ||
    authIncomplete;

  return (
    <div className="odf-m-pane__body odf-m-pane__form">
      <Helmet>
        <title>{t('Create StorageConsumer')}</title>
      </Helmet>
      <Content className="odf-m-pane__heading odf-m-pane__heading--baseline">
        <Content component={ContentVariants.h1}>
          {t('Create StorageConsumer')}
        </Content>
      </Content>
      <NamespaceSafetyBox>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <TextInputWithFieldRequirements
            control={control}
            fieldRequirements={fieldRequirements}
            popoverProps={{
              headerContent: t('Name requirements'),
              footerContent: `${exampleTranslatedText}: stark-lab-consumer`,
            }}
            formGroupProps={{
              label: t('StorageConsumer Name'),
              fieldId: 'storageconsumer-name',
              className: 'control-label',
            }}
            textInputProps={{
              id: 'storageconsumer-name',
              name: 'storageconsumerName',
              className: 'pf-v6-c-form-control',
              type: 'text',
              placeholder: t('stark-lab-storage-consumer'),
              'data-test': 'storage-consumer-name',
              isRequired: true,
            }}
          />
          <FormGroup label={t('Storage type')}>
            <Radio
              isChecked={!isBackedByConsumer}
              id="new-storage"
              name="storage-type"
              label={t('New storage')}
              description={t(
                'Provision a dedicated, isolated storage instance with new backing resources.'
              )}
              onChange={() => setIsBackedByConsumer(false)}
            />
            <Radio
              isChecked={isBackedByConsumer}
              id="backed-by-existing"
              name="storage-type"
              label={t('Backed by existing')}
              description={t(
                'Share storage resources with an existing consumer.'
              )}
              onChange={() => setIsBackedByConsumer(true)}
              className="pf-v6-u-mt-sm"
            />
            {isBackedByConsumer && (
              <FormGroup
                label={t('Backing Storage Consumer')}
                className="pf-v6-u-mt-sm"
              >
                <ResourceDropdown
                  resource={storageConsumerResource}
                  resourceModel={StorageConsumerModel}
                  onSelect={setBackingStorageConsumer}
                  filterResource={filterStorageConsumerResource}
                />
              </FormGroup>
            )}
          </FormGroup>
          <StorageQuotaBody quota={quota} setQuota={setQuota} />
          <Title
            headingLevel="h2"
            size="md"
            className="pf-v6-u-mt-lg pf-v6-u-mb-0"
          >
            {t('Authentication')}
          </Title>
          <Content component={ContentVariants.small} className="pf-v6-u-mb-sm">
            {t(
              'Provide details for mutual TLS (mTLS) communication with the Data Foundation system.'
            )}
            <br />
            {t(
              'Both fields are optional. If you leave them empty, the connection is not verified.'
            )}
          </Content>
          {authIncomplete && (
            <HelperText className="pf-v6-u-mb-sm">
              <HelperTextItem
                variant="warning"
                className="pf-v6-u-font-weight-bold"
              >
                {t('Both fields must be complete to verify the connection')}
              </HelperTextItem>
            </HelperText>
          )}
          <FormGroup
            label={
              <span className="pf-v6-u-font-weight-normal">
                {t('Client CA')}
              </span>
            }
            fieldId="client-ca"
            labelHelp={
              <FieldLevelHelp>
                {t(
                  'This CA will be used to verify the client cert in the incoming connections.'
                )}
              </FieldLevelHelp>
            }
          >
            <FileUpload
              id="client-ca"
              type="text"
              value={clientCAFile.value}
              filename={clientCAFile.fileName}
              filenamePlaceholder={t('Drag and drop a file or upload')}
              browseButtonText={t('Upload')}
              clearButtonText={t('Clear')}
              hideDefaultPreview={!clientCAFile.value}
              isReadOnly
              validated={getValidatedProp(!!clientCAFile.error)}
              onFileInputChange={(_event, file) => readClientCA(file)}
              onClearClick={clearClientCA}
              dropzoneProps={{
                accept: {
                  'text/plain': ['.crt', '.pem'],
                },
                maxSize: KMSMaxFileUploadSize,
                onDropRejected: () => {
                  setClientCAFile({
                    ...emptyClientCAFile,
                    error: t(
                      'Invalid file: File size exceeds 4MB limit or incorrect file extension (only .crt and .pem files allowed).'
                    ),
                  });
                },
              }}
              data-test="client-ca"
            />
            <FormHelperText>
              <HelperText>
                {!!clientCAFile.error && (
                  <HelperTextItem variant="error">
                    {clientCAFile.error}
                  </HelperTextItem>
                )}
                {hasClientSAN && !hasClientCA && (
                  <HelperTextItem>
                    {t('Upload a client CA, or clear the client DNS')}
                  </HelperTextItem>
                )}
                <HelperTextItem>
                  {t('Upload the client CA .crt or .pem file')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup
            label={
              <span className="pf-v6-u-font-weight-normal">
                {t('Client DNS Subject Alternative Name (SAN)')}
              </span>
            }
            fieldId="client-san"
            labelHelp={
              <FieldLevelHelp>
                {t(
                  'The Subject Alternative Name (SAN) is the DNS name that identifies a client in its certificate. The Data Foundation system compares it with the name in the certificate that the client presents. You can change it later.'
                )}
              </FieldLevelHelp>
            }
          >
            <TextInput
              id="client-san"
              value={clientSAN}
              onChange={(_e, value) => setClientSAN(value)}
              placeholder="client-1.example.com"
              data-test="client-san"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {hasClientCA
                    ? t('Enter a client DNS, or clear the client CA')
                    : t('Enter the DNS name listed in the client certificate.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <ButtonBar errorMessage={error} inProgress={progress}>
            <ActionGroup className="pf-v6-c-form">
              <Button
                id="submit-btn"
                type="submit"
                variant="primary"
                isDisabled={isDisabled}
              >
                {t('Create')}
              </Button>
              <Button onClick={() => navigate(-1)} variant="secondary">
                {t('Cancel')}
              </Button>
            </ActionGroup>
          </ButtonBar>
        </Form>
      </NamespaceSafetyBox>
    </div>
  );
};

export default CreateStorageConsumer;
