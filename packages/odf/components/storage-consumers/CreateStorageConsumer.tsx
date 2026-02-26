import * as React from 'react';
import NamespaceSafetyBox from '@odf/core/components/utils/safety-box';
import { DiskSize } from '@odf/core/constants';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { StorageQuota } from '@odf/core/types';
import {
  ButtonBar,
  fieldRequirementsTranslations,
  formSettings,
  getName,
  StorageConsumerKind,
  StorageConsumerModel,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useDeepCompareMemoize,
  useYupValidationResolver,
} from '@odf/shared';
import validationRegEx from '@odf/shared/utils/validation';
import {
  getAPIVersionForModel,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Helmet } from 'react-helmet';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom-v5-compat';
import * as Yup from 'yup';
import {
  Form,
  Content,
  ContentVariants,
  ActionGroup,
  Button,
} from '@patternfly/react-core';
import { StorageQuotaBody } from './onboarding-modal';

const unlimitedQuota: StorageQuota = {
  value: 0,
  unit: null,
};

const useStorageConsumerFormSchema = () => {
  const { t } = useCustomTranslation();
  const [data] = useK8sWatchResource<StorageConsumerKind[]>({
    groupVersionKind: {
      group: StorageConsumerModel.apiGroup,
      kind: StorageConsumerModel.kind,
      version: StorageConsumerModel.apiVersion,
    },
    isList: true,
  });
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

const CreateStorageConsumer: React.FC = () => {
  const [name, setName] = React.useState('');
  const [progress, setProgress] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [quota, setQuota] = React.useState<StorageQuota>(unlimitedQuota);

  const { odfNamespace } = useODFNamespaceSelector();

  const flags = useODFSystemFlagsSelector();
  const clusterName = flags?.systemFlags?.[odfNamespace]?.odfSystemName;

  const navigate = useNavigate();

  const { formSchema, fieldRequirements } = useStorageConsumerFormSchema();
  const resolver = useYupValidationResolver(formSchema);
  const { control, handleSubmit, watch } = useForm({
    ...formSettings,
    resolver,
  });
  const { t } = useCustomTranslation();

  const storageConsumerName = watch('storageconsumerName');
  React.useEffect(() => {
    setName(storageConsumerName);
  }, [storageConsumerName, setName]);

  const onSubmit = (_unused, event) => {
    event.preventDefault();
    const quotaInGib: number = (() => {
      if (quota.unit === DiskSize.Gi) {
        return Number(quota.value);
      } else {
        return Number(quota.value) * 1024;
      }
    })();
    setProgress(true);
    k8sCreate<StorageConsumerKind>({
      model: StorageConsumerModel,
      data: {
        apiVersion: getAPIVersionForModel(StorageConsumerModel),
        kind: StorageConsumerModel.kind,
        metadata: {
          name,
          namespace: odfNamespace,
        },
        spec: {
          storageQuotaInGiB: quotaInGib,
          storageClasses: [
            { name: `${clusterName}-ceph-rbd` },
            { name: `${clusterName}-cephfs` },
          ],
          volumeSnapshotClasses: [
            { name: `${clusterName}-rbdplugin-snapclass` },
            { name: `${clusterName}-cephfsplugin-snapclass` },
          ],
        },
      },
    })
      .then(() => {
        setProgress(false);
        navigate(-1);
      })
      .catch((err) => {
        setProgress(false);
        setError(err?.message || err);
      });
  };

  const exampleTranslatedText = t('Example');

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
          <StorageQuotaBody quota={quota} setQuota={setQuota} />
          <ButtonBar errorMessage={error} inProgress={progress}>
            <ActionGroup className="pf-v6-c-form">
              <Button id="submit-btn" type="submit" variant="primary">
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
