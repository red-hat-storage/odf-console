import * as React from 'react';
import useS3BucketFormValidation from '@odf/core/components/s3-browser/create-bucket/useS3BucketFormValidation';
import { getVectorBucketOverviewBaseRoute } from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import {
  ButtonBar,
  formSettings,
  TextInputWithFieldRequirements,
  useCustomTranslation,
  useYupValidationResolver,
} from '@odf/shared';
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
} from '@patternfly/react-core';
import '../../s3-browser/create-bucket/create-bucket-form.scss';
import { S3VectorsContext } from '../s3-vectors-context';

type FormData = {
  bucketName: string;
};

export type CreateVectorBucketFormProps = {
  /** Rendered inside the form immediately above the Create/Cancel buttons. */
  subpathField?: React.ReactNode;
};

const CreateVectorBucketForm: React.FC<CreateVectorBucketFormProps> = ({
  subpathField,
}) => {
  const { t } = useCustomTranslation();
  const navigate = useNavigate();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const providerType = S3ProviderType.Noobaa;
  const { bucketFormSchema, fieldRequirements } = useS3BucketFormValidation();
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
      });
    } catch ({ name, message }) {
      setErrorMessage(
        `Error while creating vector bucket: ${name}: ${message}`
      );
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
      {subpathField}
      <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
        <ActionGroup className="pf-v6-c-form">
          <Button
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
