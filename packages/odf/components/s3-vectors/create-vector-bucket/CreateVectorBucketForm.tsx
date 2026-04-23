import * as React from 'react';
import { useS3BucketFormValidation as useS3VectorBucketFormValidation } from '@odf/core/components/s3-common/hooks/useS3BucketFormValidation';
import { getVectorBucketOverviewBaseRoute } from '@odf/core/constants/s3-vectors';
import { NamespaceStoreKind, S3ProviderType } from '@odf/core/types';
import {
  ButtonBar,
  formSettings,
  getName,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useYupValidationResolver,
} from '@odf/shared';
import { useActiveNamespace } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  ButtonType,
  ButtonVariant,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import '../../s3-browser/create-bucket/create-bucket-form.scss';
import { NamespaceStoreDropdown } from '../../namespace-store/namespace-store-dropdown';
import { S3VectorsContext } from '../s3-vectors-context';

type FormData = {
  bucketName: string;
};

const CreateVectorBucketForm: React.FC = () => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();

  const [activeNamespace] = useActiveNamespace();
  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const providerType = s3VectorsClient.providerType as S3ProviderType;

  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [nsfs, setNsfs] = React.useState('');
  const [subpathValue, setSubpathValue] = React.useState('');

  const { bucketFormSchema, fieldRequirements } =
    useS3VectorBucketFormValidation();
  const resolver = useYupValidationResolver(bucketFormSchema);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitted },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const save = async (formData: FormData) => {
    setInProgress(true);
    setErrorMessage('');
    const { bucketName } = formData;
    try {
      await s3VectorsClient.createVectorBucket({
        vectorBucketName: bucketName,
        namespaceStoreFilesystem: nsfs,
        subpath: subpathValue,
      });
    } catch (error) {
      setErrorMessage((error as Error)?.message || JSON.stringify(error));
      setInProgress(false);
      return;
    }

    navigate(
      `${getVectorBucketOverviewBaseRoute(bucketName, providerType)}/vector-indexes`
    );
  };

  return (
    <Form onSubmit={handleSubmit(save)} className="pf-v6-u-w-50">
      <TextInputWithFieldRequirements
        control={control}
        fieldRequirements={fieldRequirements}
        popoverProps={{
          headerContent: t('Name requirements'),
          footerContent: `${t('Example')}: my-bucket`,
        }}
        formGroupProps={{
          label: t('Bucket Name'),
          fieldId: 'bucket-name',
          isRequired: true,
          className: 'control-label',
        }}
        textInputProps={{
          id: 'bucket-name',
          name: 'bucketName',
          className: 'pf-v6-c-form-control',
          type: 'text',
          placeholder: t('my-bucket'),
          'aria-describedby': 'bucket-name-help',
          'data-test': 'bucket-name',
        }}
        helperText={t('A unique name for your bucket.')}
      />
      {!isValid && isSubmitted && (
        <Alert
          variant={AlertVariant.danger}
          isInline
          title={t('Address form errors to proceed')}
        />
      )}
      <FormGroup
        label={t('Filesystem NamespaceStore')}
        fieldId="vector-bucket-filesystem-ns"
        className="pf-v6-u-mb-md"
        isRequired
      >
        <NamespaceStoreDropdown
          id="vector-bucket-filesystem-ns-dropdown"
          namespace={activeNamespace}
          selectedKey={nsfs}
          onChange={(ns: NamespaceStoreKind) => setNsfs(getName(ns))}
          filterFilesystem
          creatorDisabled
        />
      </FormGroup>
      <FormGroup
        label={t('Subpath')}
        fieldId="vector-bucket-subpath-s3"
        className="pf-v6-u-mb-md"
      >
        <TextInput
          id="vector-bucket-subpath-s3"
          type="text"
          value={subpathValue}
          onChange={(_event, value) => setSubpathValue(value)}
          className="pf-v6-c-form-control"
          data-test-id="vector-bucket-subpath-s3"
        />
      </FormGroup>
      <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
        <ActionGroup className="pf-v6-c-form">
          <Button
            isDisabled={!isValid || inProgress || !nsfs}
            id="create-s3-bucket-btn"
            type={ButtonType.submit}
            variant={ButtonVariant.primary}
            data-test="obc-create"
          >
            {t('Create')}
          </Button>
          <Button
            onClick={() => navigate(-1)}
            type={ButtonType.button}
            variant={ButtonVariant.secondary}
          >
            {t('Cancel')}
          </Button>
        </ActionGroup>
      </ButtonBar>
    </Form>
  );
};

export default CreateVectorBucketForm;
