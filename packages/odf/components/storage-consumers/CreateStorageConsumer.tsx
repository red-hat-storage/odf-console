import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import {
  AUTH_MAX_FILE_SIZE,
  CERTIFICATE_EXTENSIONS,
  CERTIFICATE_PLACEHOLDER,
  CLIENT_CA_CONFIGMAP_KEY,
  DiskSize,
} from '@odf/core/constants';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { StorageQuota } from '@odf/core/types';
import {
  ButtonBar,
  ConfigMapKind,
  ConfigMapModel,
  emptyTextFileValue,
  FieldLevelHelp,
  fieldRequirementsTranslations,
  formSettings,
  getName,
  ResourceDropdown,
  StorageConsumerKind,
  StorageConsumerModel,
  StorageConsumerState,
  TextFileUpload,
  TextFileValue,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useDeepCompareMemoize,
  useYupValidationResolver,
} from '@odf/shared';
import { getResourceName } from '@odf/shared/utils';
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
  Title,
} from '@patternfly/react-core';
import { StorageQuotaBody } from './onboarding-modal';

const unlimitedQuota: StorageQuota = {
  value: 0,
  unit: null,
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
    React.useState<TextFileValue>(emptyTextFileValue);
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

  const hasClientCA = !!clientCAFile.value.trim();
  const hasClientSAN = !!clientSAN.trim();

  const onSubmit = async (_unused, event) => {
    event.preventDefault();
    const certificate = clientCAFile.value.trim();
    const san = clientSAN.trim();
    if (!certificate || !san || clientCAFile.error) {
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
      const configMap = await k8sCreate<ConfigMapKind>({
        model: ConfigMapModel,
        data: {
          apiVersion: ConfigMapModel.apiVersion,
          kind: ConfigMapModel.kind,
          metadata: {
            name: getResourceName(name, 'client-ca'),
            namespace: odfNamespace,
          },
          data: {
            [CLIENT_CA_CONFIGMAP_KEY]: certificate,
          },
        },
      });
      clientCAConfigMapName = getName(configMap);

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
            clientCAConfigMap: { name: clientCAConfigMapName },
            clientSAN: san,
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
    progress ||
    !isValid ||
    !hasClientCA ||
    !hasClientSAN ||
    !!clientCAFile.error;

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
          <div className="pf-v6-u-mt-lg">
            <Title headingLevel="h2" size="md" className="pf-v6-u-mb-xs">
              {t('Authentication')}
            </Title>
            <Content component={ContentVariants.small} className="pf-v6-u-mb-0">
              {t(
                'Provide details for mutual TLS (mTLS) communication with the Data Foundation system.'
              )}
            </Content>
          </div>
          <TextFileUpload
            id="client-ca"
            label={t('Client CA')}
            helpText={t('Paste the client CA or upload a .crt or .pem file.')}
            popover={t(
              'This CA will be used to verify the client cert in the incoming connections.'
            )}
            extensions={CERTIFICATE_EXTENSIONS}
            invalidFileMessage={t(
              'Invalid file: Incorrect file extension (only .crt and .pem files allowed).'
            )}
            tooLargeMessage={t('Text exceeds the 1MB limit.')}
            maxFileSize={AUTH_MAX_FILE_SIZE}
            textAreaPlaceholder={CERTIFICATE_PLACEHOLDER}
            file={clientCAFile}
            onChange={setClientCAFile}
          />
          <FormGroup
            label={
              <span className="pf-v6-u-font-weight-normal">
                {t('Client DNS Subject Alternative Name (SAN)')}
              </span>
            }
            fieldId="client-san"
            isRequired
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
              isRequired
              data-test="client-san"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('Enter the DNS name listed in the client certificate.')}
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
