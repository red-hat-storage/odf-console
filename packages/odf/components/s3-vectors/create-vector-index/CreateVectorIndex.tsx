import * as React from 'react';
import {
  getVectorBucketIndexesListRoute,
  getVectorBucketOverviewBaseRoute,
  getVectorBucketsListRoute,
  VECTOR_INDEX_NAME_MAX_LENGTH,
  VECTOR_INDEX_NAME_MIN_LENGTH,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import {
  TextInputWithFieldRequirements,
  ButtonBar,
  useYupValidationResolver,
  formSettings,
  useCustomTranslation,
} from '@odf/shared';
import PageHeading from '@odf/shared/heading/page-heading';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  ButtonType,
  ButtonVariant,
  Content,
  ContentVariants,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  Radio,
} from '@patternfly/react-core';
import useS3VectorIndexValidation from '../hooks/useS3VectorIndexFormValidation';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';

enum DistanceMetric {
  Cosine = 'cosine',
  Euclidean = 'euclidean',
}

type FormData = {
  vectorIndexName: string;
};

const CreateVectorIndexForm: React.FC = () => {
  const { t } = useCustomTranslation();
  const { s3Provider, vectorBucketName } = useParams();

  const navigate = useNavigate();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [dimension, setDimension] = React.useState(90);
  const [distanceMetric, setDistanceMetric] = React.useState<DistanceMetric>(
    DistanceMetric.Cosine
  );

  const { s3VectorsClient } = React.useContext(S3VectorsContext);

  const breadcrumbs = [
    {
      name: t('Vector buckets'),
      path: getVectorBucketsListRoute(s3Provider as S3ProviderType),
    },
    {
      name: vectorBucketName,
      path: getVectorBucketOverviewBaseRoute(
        vectorBucketName,
        s3Provider as S3ProviderType
      ),
    },
    {
      name: t('Vector indexes'),
      path: getVectorBucketIndexesListRoute(
        vectorBucketName,
        s3Provider as S3ProviderType
      ),
    },
    {
      name: t('Create vector index'),
      path: '',
    },
  ];

  const { vectorIndexSchema, fieldRequirements } = useS3VectorIndexValidation();
  const resolver = useYupValidationResolver(vectorIndexSchema);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useForm<FormData>({
    ...(formSettings as any),
    resolver,
    defaultValues: { vectorIndexName: '' },
  });

  const onDimensionChange = (
    funcType: 'onChange' | 'onMinus' | 'onPlus',
    event?: React.FormEvent<HTMLInputElement>
  ) => {
    let newValue: number;
    switch (funcType) {
      case 'onChange': {
        const value = (event?.target as HTMLInputElement)?.value;
        const numValue = parseInt(value, 10);
        newValue = isNaN(numValue)
          ? 0
          : Math.max(1, Math.min(numValue || 1, 4096));
        break;
      }
      case 'onMinus': {
        newValue = Math.max(dimension - 1, 1);
        break;
      }
      case 'onPlus': {
        newValue = Math.min(dimension + 1, 4096);
        break;
      }
    }
    setDimension(newValue);
  };

  const save = async (formData: FormData) => {
    setInProgress(true);
    setErrorMessage('');
    const { vectorIndexName: indexName } = formData;
    try {
      await s3VectorsClient.createIndex({
        vectorBucketName,
        indexName,
        dataType: 'float32',
        dimension,
        distanceMetric,
      });
    } catch ({ name, message }) {
      setErrorMessage(`Error while creating vector index: ${name}: ${message}`);
      setInProgress(false);
      return;
    }
    navigate(
      getVectorBucketOverviewBaseRoute(
        vectorBucketName,
        s3Provider as S3ProviderType
      )
    );
  };

  return (
    <>
      <PageHeading breadcrumbs={breadcrumbs} title={t('Create vector index')}>
        <Content component={ContentVariants.p} className="text-muted">
          {t(
            'Create a vector index to start storing AI-ready vectors in this bucket.'
          )}
        </Content>
      </PageHeading>
      <div className="odf-m-pane__body">
        <Form onSubmit={handleSubmit(save)} className="pf-v6-u-w-50">
          <TextInputWithFieldRequirements
            control={control as any}
            fieldRequirements={fieldRequirements}
            popoverProps={{
              headerContent: t('Name requirements'),
              footerContent: `${t('Example')}: my-vector-index`,
            }}
            formGroupProps={{
              label: t('Vector index name'),
              fieldId: 'vector-index-name',
              isRequired: true,
              className: 'control-label',
            }}
            textInputProps={{
              id: 'vector-index-name',
              name: 'vectorIndexName',
              className: 'pf-v6-c-form-control',
              type: 'text',
              placeholder: t('my-vector-index'),
              'aria-describedby': 'vector-index-name-help',
              'data-test': 'vector-index-name',
            }}
            helperText={t(
              `Vector index names must be ${VECTOR_INDEX_NAME_MIN_LENGTH} to ${VECTOR_INDEX_NAME_MAX_LENGTH} characters and unique within this vector bucket. Valid characters are a-z, 0-9, hyphens (-), and dots (.).`
            )}
          />
          <FormGroup
            fieldId="dimension"
            label={t('Dimension')}
            className="pf-v6-u-mb-sm"
            isRequired
          >
            <NumberInput
              id="vector-index-dimension-input"
              value={dimension}
              min={1}
              max={4096}
              onMinus={() => onDimensionChange('onMinus')}
              onPlus={() => onDimensionChange('onPlus')}
              onChange={(event) => onDimensionChange('onChange', event)}
              minusBtnAriaLabel={t('Decrement')}
              plusBtnAriaLabel={t('Increment')}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('A dimension must be an integer between 1 and 4096')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup
            label={t('Distance metric')}
            isRequired
            fieldId="distance-metric"
            className="pf-v6-u-mb-md"
          >
            <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
              <Radio
                label={t('Cosine')}
                description={t(
                  'Measures the angle between vectors. Best for normalized vectors.'
                )}
                name="distance-metric-radio"
                isChecked={distanceMetric === DistanceMetric.Cosine}
                onChange={() => setDistanceMetric(DistanceMetric.Cosine)}
                id="distance-metric-cosine"
                className="pf-v6-u-mb-sm"
              />
              <Radio
                label={t('Euclidean')}
                description={t(
                  'Measures straight-line distance between vectors.'
                )}
                name="distance-metric-radio"
                isChecked={distanceMetric === DistanceMetric.Euclidean}
                onChange={() => setDistanceMetric(DistanceMetric.Euclidean)}
                id="distance-metric-euclidean"
                className="pf-v6-u-mt-sm"
              />
            </span>
          </FormGroup>
          {isSubmitted && !isValid && (
            <Alert
              variant={AlertVariant.danger}
              isInline
              title={
                errors.vectorIndexName?.message ||
                errors.root?.message ||
                t('Address form errors to proceed')
              }
            />
          )}
          <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
            <ActionGroup className="pf-v6-c-form">
              <Button
                id="create-vector-index-btn"
                isDisabled={!isValid || inProgress}
                type={ButtonType.submit}
                variant={ButtonVariant.primary}
                data-test="create-vector-index"
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
      </div>
    </>
  );
};

const CreateVectorIndex: React.FC = () => (
  <S3VectorsProvider>
    <CreateVectorIndexForm />
  </S3VectorsProvider>
);

export default CreateVectorIndex;
