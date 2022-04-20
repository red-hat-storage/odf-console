import * as React from 'react';
import { FieldLevelHelp } from '@odf/shared/generic/FieldLevelHelp';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertActionCloseButton,
  Form,
  FormGroup,
  Radio,
  TextArea,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import { FEATURES } from '../../../features';
import { BucketClassType } from '../../../types';
import { validateBucketClassName } from '../../../utils';
import { ExternalLink } from '../../mcg-endpoints/gcp-endpoint-type';
import { Action, State } from '../state';
import '../create-bc.scss';

export const bucketClassTypeRadios = (t: TFunction) => [
  {
    id: BucketClassType.STANDARD,
    value: BucketClassType.STANDARD,
    label: t('Standard'),
    description: t(
      'Data will be consumed by a Multi-cloud object gateway, deduped, compressed, and encrypted. The encrypted chunks would be saved on the selected BackingStores. Best used when the applications would always use the OpenShift Data Foundation endpoints to access the data.'
    ),
  },
  {
    id: BucketClassType.NAMESPACE,
    value: BucketClassType.NAMESPACE,
    label: t('Namespace'),
    description: t(
      'Data is stored on the NamespaceStores without performing de-duplication, compression, or encryption. BucketClasses of namespace type allow connecting to existing data and serving from them. These are best used for existing data or when other applications (and cloud-native services) need to access the data from outside OpenShift Data Foundation.'
    ),
  },
];

const GeneralPage: React.FC<GeneralPageProps> = ({ dispatch, state }) => {
  const { t } = useTranslation();

  const [showHelp, setShowHelp] = React.useState(true);

  const [validated, setValidated] = React.useState<ValidatedOptions>(
    ValidatedOptions.default
  );

  const isNamespaceStoreSupported = useFlag(FEATURES.OCS_NAMESPACE_STORE);
  const onChange = (value: string) => {
    dispatch({ type: 'setBucketClassName', name: value });
    if (validateBucketClassName(value)) {
      setValidated(ValidatedOptions.success);
    } else {
      setValidated(ValidatedOptions.error);
    }
  };

  return (
    <div className="nb-create-bc-step-page">
      {showHelp && (
        <Alert
          isInline
          variant="info"
          title={t('What is a BucketClass?')}
          className="nb-create-bc-step-page__info"
          actionClose={
            <AlertActionCloseButton onClose={() => setShowHelp(false)} />
          }
        >
          <p>
            {t(
              'A set of policies which would apply to all buckets (OBCs) created with the specific bucket class. These policies include placement, namespace and caching'
            )}
          </p>
          <ExternalLink
            href="https://github.com/noobaa/noobaa-operator/blob/master/doc/bucket-class-crd.md"
            text={t('Learn More')}
          />
        </Alert>
      )}
      <Form className="nb-create-bc-step-page-form">
        {isNamespaceStoreSupported && (
          <FormGroup
            fieldId="bucketclasstype-radio"
            className="nb-create-bc-step-page-form__element nb-bucket-class-type-form__element"
            isRequired
            label={t('BucketClass type')}
          >
            {bucketClassTypeRadios(t).map((radio) => {
              const checked = radio.value === state.bucketClassType;
              return (
                <Radio
                  key={radio.id}
                  {...radio}
                  data-test={`${radio.value.toLowerCase()}-radio`}
                  onChange={() => {
                    dispatch({
                      type: 'setBucketClassType',
                      value: radio.value,
                    });
                  }}
                  checked={checked}
                  className="nb-create-bc-step-page-form__radio"
                  name="bucketclasstype"
                />
              );
            })}
          </FormGroup>
        )}
        <FormGroup
          labelIcon={
            <FieldLevelHelp>
              <ul>
                <li>{t('3-63 chars')}</li>
                <li>{t('Starts and ends with lowercase number or letter')}</li>
                <li>
                  {t(
                    'Only lowercase letters, numbers, non-consecutive periods or hyphens'
                  )}
                </li>
                <li>{t('Avoid using the form of an IP address')}</li>
                <li>{t('Globally unique name')}</li>
              </ul>
            </FieldLevelHelp>
          }
          className="nb-create-bc-step-page-form__element"
          fieldId="bucketclassname-input"
          label={t('BucketClass name')}
          helperText={t(
            'A unique name for the bucket class within the project.'
          )}
        >
          <TextInput
            data-test="bucket-class-name"
            placeholder={t('my-multi-cloud-mirror')}
            type="text"
            id="bucketclassname-input"
            value={state.bucketClassName}
            onChange={onChange}
            validated={validated}
            aria-label={t('BucketClass Name')}
          />
        </FormGroup>
        <FormGroup
          className="nb-create-bc-step-page-form__element"
          fieldId="bc-description"
          label={t('Description (Optional)')}
        >
          <TextArea
            data-test="bucket-class-description"
            id="bc-description"
            value={state.description}
            onChange={(data) =>
              dispatch({ type: 'setDescription', value: data })
            }
            aria-label={t('Description of bucket class')}
          />
        </FormGroup>
      </Form>
    </div>
  );
};

export default GeneralPage;

type GeneralPageProps = {
  dispatch: React.Dispatch<Action>;
  state: State;
};
