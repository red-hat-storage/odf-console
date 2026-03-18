import * as React from 'react';
import {
  getVectorBucketOverviewBaseRoute,
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
} from '@odf/shared';
import { KeyListEditor } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { Resolver, useForm } from 'react-hook-form';
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
  Radio,
} from '@patternfly/react-core';
import { S3VectorsContext } from '../s3-vectors-context';
import useS3VectorIndexFormValidation from './useS3VectorIndexFormValidation';

enum DistanceMetric {
  Cosine = 'cosine',
  Euclidean = 'euclidean',
}

type FormData = {
  vectorIndexName: string;
};

const CreateVectorIndex: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const { vectorBucketName } = useParams();
  const navigate = useNavigate();
  const [inProgress, setInProgress] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [dimension, setDimension] = React.useState(90);
  const [distanceMetric, setDistanceMetric] = React.useState<DistanceMetric>(
    DistanceMetric.Cosine
  );
  const [metadataKeys, setMetadataKeys] = React.useState<string[]>([]);

  const { s3VectorsClient } = React.useContext(S3VectorsContext);
  const providerType = S3ProviderType.Noobaa;
  const { vectorIndexSchema, fieldRequirements } =
    useS3VectorIndexFormValidation();
  const resolver = useYupValidationResolver(
    vectorIndexSchema
  ) as unknown as Resolver<FormData>;

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitted },
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
    const { vectorIndexName } = formData;
    try {
      await s3VectorsClient.createIndex({
        vectorBucketName,
        indexName: vectorIndexName,
        dataType: 'float32',
        dimension,
        distanceMetric,
      });
    } catch ({ name, message }) {
      setErrorMessage(`Error while creating vector index: ${name}: ${message}`);
      setInProgress(false);
      return;
    }
    navigate(getVectorBucketOverviewBaseRoute(vectorBucketName, providerType));
  };

  // Count valid tags (non-empty keys)
  const numberOfTagsAdded = metadataKeys?.length;
  const remainingKeys = MAX_METADATA_KEYS - numberOfTagsAdded;

  return (
    <>
      <div className="odf-create-operand__header">
        <Content className="odf-create-operand__header-text">
          <Content component={ContentVariants.h1}>
            {t('Create vector index')}
          </Content>
        </Content>
        <p>
          {t(
            'Create a vector index to start storing AI-ready vectors in this bucket.'
          )}
        </p>
      </div>
      <div className="odf-m-pane__body">
        <Form onSubmit={handleSubmit(save)} className="pf-v5-u-w-50">
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
              className: 'pf-v5-c-form-control',
              type: 'text',
              placeholder: t('my-vector-index'),
              'aria-describedby': 'vector-index-name-help',
              'data-test': 'vector-index-name',
            }}
            helperText={t('Enter a name to identify this index.')}
          />
          <FormGroup
            fieldId="dimension"
            label={t('Dimension')}
            className="pf-v5-u-mb-sm"
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
            className="pf-v5-u-mb-md"
          >
            <span className="pf-v5-u-display-flex pf-v5-u-flex-direction-column">
              <Radio
                label={t('Cosine')}
                description={t(
                  'Measures the angle between vectors. Best for normalized vectors.'
                )}
                name="distance-metric-radio"
                isChecked={distanceMetric === DistanceMetric.Cosine}
                onChange={() => setDistanceMetric(DistanceMetric.Cosine)}
                id="distance-metric-cosine"
                className="pf-v5-u-mb-sm"
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
                className="pf-v5-u-mt-sm"
              />
            </span>
          </FormGroup>
          <FormFieldGroupExpandable
            toggleAriaLabel="Details"
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
                'You can add filterable metadata (key-value pairs) to each vector when you insert it.'
              )}
              variant={AlertVariant.info}
            >
              {t(
                'All metadata is filterable by default, unless you marked it as non-filterable when you created the index.'
              )}
            </Alert>
            <FormGroup className="pf-v5-u-mt-md">
              {/* {_.isEmpty(metadataKeys) && (
                <div className="pf-v5-u-disabled-color-100 pf-v5-u-mr-sm">
                  {t('No metadata keys are attached to this resource.')}
                </div>
              )} */}
              <KeyListEditor
                className="pf-v5-u-font-weight-bold pf-v5-u-font-size-sm"
                keyList={metadataKeys}
                onChange={setMetadataKeys}
                addButtonLabel={t('Add key')}
                isAddDisabled={remainingKeys <= 0}
                keysMaxLength={METADATA_KEY_MAX_LENGTH}
              />
              <Content
                component="p"
                className="pf-v5-u-disabled-color-100 pf-v5-u-mr-sm"
              >
                {t(
                  `You can add up to ${remainingKeys} non-filterable metadata keys.`
                )}
              </Content>
            </FormGroup>
          </FormFieldGroupExpandable>

          {!isValid && isSubmitted && (
            <Alert
              variant={AlertVariant.danger}
              isInline
              title={t('Address form errors to proceed')}
            />
          )}
          <ButtonBar errorMessage={errorMessage} inProgress={inProgress}>
            <ActionGroup className="pf-v5-c-form">
              <Button
                id="create-vector-index-btn"
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

export default CreateVectorIndex;
