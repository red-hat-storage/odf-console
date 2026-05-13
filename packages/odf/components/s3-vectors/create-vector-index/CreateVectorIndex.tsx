import * as React from 'react';
import {
  getVectorBucketIndexesListRoute,
  getVectorBucketOverviewBaseRoute,
  getVectorBucketsListRoute,
  MAX_METADATA_KEYS,
  METADATA_KEY_MAX_LENGTH,
} from '@odf/core/constants/s3-vectors';
import { S3ProviderType } from '@odf/core/types';
import {
  TextInputWithFieldRequirements,
  ButtonBar,
  useYupValidationResolver,
  formSettings,
  useCustomTranslation,
  FieldLevelHelp,
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
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  NumberInput,
  PopoverPosition,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { useS3BucketFormValidation as useS3VectorIndexFormValidation } from '../../s3-common/hooks/useS3BucketFormValidation';
import { S3VectorsContext, S3VectorsProvider } from '../s3-vectors-context';

enum DistanceMetric {
  Cosine = 'cosine',
  Euclidean = 'euclidean',
}

type FormData = {
  /** Must match `useS3BucketFormValidation` schema field (`bucketName`). */
  bucketName: string;
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
  const [metadataKeys, setMetadataKeys] = React.useState<string[]>([]);
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

  const { bucketFormSchema: vectorIndexSchema, fieldRequirements } =
    useS3VectorIndexFormValidation();
  const resolver = useYupValidationResolver(vectorIndexSchema);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useForm<FormData>({
    ...(formSettings as any),
    resolver,
    defaultValues: { bucketName: '' },
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
    const { bucketName: indexName } = formData;
    try {
      await s3VectorsClient.createIndex({
        vectorBucketName,
        indexName,
        dataType: 'float32',
        dimension,
        distanceMetric,
        metadataConfiguration: {
          nonFilterableMetadataKeys: metadataKeys,
        },
      });
    } catch (error) {
      setErrorMessage((error as Error)?.message || JSON.stringify(error));
      setInProgress(false);
      return;
    }
    setInProgress(false);
    navigate(
      getVectorBucketOverviewBaseRoute(
        vectorBucketName,
        s3Provider as S3ProviderType
      )
    );
  };
  const numberOfTagsAdded = metadataKeys.length;
  const remainingKeys = MAX_METADATA_KEYS - numberOfTagsAdded;

  return (
    <>
      <PageHeading breadcrumbs={breadcrumbs} title={t('Create vector index')}>
        <Content component={ContentVariants.p}>
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
              name: 'bucketName',
              className: 'pf-v6-c-form-control',
              type: 'text',
              placeholder: t('my-vector-index'),
              'aria-describedby': 'vector-index-name-help',
              'data-test': 'vector-index-name',
            }}
            helperText={t(`A unique name within this vector bucket.`)}
          />
          <FormGroup
            fieldId="dimension"
            label={t('Dimension')}
            className="pf-v6-u-mb-sm"
            isRequired
            labelHelp={
              <FieldLevelHelp position={PopoverPosition.topStart}>
                {t(
                  'A dimension is the number of values in a vector. Larger dimensions require more storage.'
                )}
              </FieldLevelHelp>
            }
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
            labelHelp={
              <FieldLevelHelp position={PopoverPosition.topStart}>
                {t(
                  'The distance metric measures the distance between a query vector and stored vector.'
                )}
              </FieldLevelHelp>
            }
          >
            <span className="pf-v6-u-display-flex pf-v6-u-flex-direction-column">
              <Radio
                label={t('Cosine')}
                description={t(
                  'Measures similarity between two vectors based only on direction.'
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
                  'Measures straight-line distance between two vectors using both direction and magnitude.'
                )}
                name="distance-metric-radio"
                isChecked={distanceMetric === DistanceMetric.Euclidean}
                onChange={() => setDistanceMetric(DistanceMetric.Euclidean)}
                id="distance-metric-euclidean"
                className="pf-v6-u-mt-sm"
              />
            </span>
          </FormGroup>
          <FormFieldGroupExpandable
            toggleAriaLabel={t('Details')}
            header={
              <FormFieldGroupHeader
                titleText={{
                  id: 'expand-section',
                  text: t('Non-filterable metadata (optional)'),
                }}
                titleDescription={t(
                  `Non-filterable metadata keys allow you to enrich vectors with additional context during storage and retrieval. Unlike default metadata fields, these keys can't be used as query filters. After creating a vector index, you can't modify any non-filterable metadata keys.`
                )}
              />
            }
          >
            <Alert
              title={t(
                'You can add filterable metadata keys to each vector when you insert it.'
              )}
              variant={AlertVariant.info}
            >
              {t(
                'All metadata is filterable by default, unless you marked it as non-filterable when you created the index.'
              )}
            </Alert>
            <FormGroup className="pf-v6-u-mt-md">
              {metadataKeys.map((element, index) => (
                <span
                  key={`metadata-key-${index}`}
                  className="pf-v6-u-display-flex pf-v6-u-flex-direction-row pf-v6-u-mb-xs"
                >
                  <TextInput
                    value={element}
                    onChange={(_e, value) => {
                      const next = [...metadataKeys];
                      next[index] = value;
                      setMetadataKeys(next);
                    }}
                    placeholder={t('Key')}
                    maxLength={METADATA_KEY_MAX_LENGTH}
                    className="pf-v6-u-mr-sm pf-v6-u-w-50"
                  />
                  <Button
                    icon={<TrashIcon />}
                    variant={ButtonVariant.plain}
                    onClick={() =>
                      setMetadataKeys(
                        metadataKeys.filter((_, i) => i !== index)
                      )
                    }
                  />
                </span>
              ))}
              <Button
                icon={<PlusCircleIcon />}
                variant={ButtonVariant.link}
                onClick={() => setMetadataKeys([...metadataKeys, ''])}
                className="pf-v6-u-mt-sm"
                isDisabled={remainingKeys <= 0}
              >
                {metadataKeys.length > 0 ? t('Add another key') : t('Add key')}
              </Button>
              <Content
                component="p"
                className="pf-v6-u-disabled-color-100 pf-v6-u-mr-sm"
              >
                {t(`You can add up to 10 non-filterable metadata keys`)}
              </Content>
            </FormGroup>
          </FormFieldGroupExpandable>
          {isSubmitted && !isValid && (
            <Alert
              variant={AlertVariant.danger}
              isInline
              title={
                errors.bucketName?.message ||
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
