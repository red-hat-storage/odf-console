import * as React from 'react';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { useK8sList } from '@odf/shared/hooks/useK8sList';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { isValidIP } from '@odf/shared/utils';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import { TFunction } from 'i18next';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
  Alert,
  AlertActionCloseButton,
  Form,
  FormGroup,
  Radio,
  TextArea,
} from '@patternfly/react-core';
import { NooBaaBucketClassModel } from '../../../models';
import { BucketClassKind, BucketClassType } from '../../../types';
import validationRegEx from '../../../utils/validation';
import { ExternalLink } from '../../mcg-endpoints/gcp-endpoint-type';
import { Action, State } from '../state';
import '../create-bc.scss';

export const bucketClassTypeRadios = (t: TFunction) => [
  {
    id: BucketClassType.STANDARD,
    value: BucketClassType.STANDARD,
    label: t('Standard'),
    description: t(
      'Data will be consumed by a Multi-cloud object gateway, deduped, compressed, and encrypted. The encrypted chunks would be saved on the selected BackingStores. Best used when the applications would always use the Data Foundation endpoints to access the data.'
    ),
  },
  {
    id: BucketClassType.NAMESPACE,
    value: BucketClassType.NAMESPACE,
    label: t('Namespace'),
    description: t(
      'Data is stored on the NamespaceStores without performing de-duplication, compression, or encryption. BucketClasses of namespace type allow connecting to existing data and serving from them. These are best used for existing data or when other applications (and cloud-native services) need to access the data from outside Data Foundation.'
    ),
  },
];

const GeneralPage: React.FC<GeneralPageProps> = ({
  dispatch,
  state,
  namespace,
}) => {
  const { t } = useCustomTranslation();

  const [showHelp, setShowHelp] = React.useState(true);

  const [data, loaded, loadError] = useK8sList<BucketClassKind>(
    NooBaaBucketClassModel,
    namespace
  );

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((dataItem) => getName(dataItem)) : [];

    const fieldRequirements = [
      t('3-63 characters'),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      t('Avoid using the form of an IP address'),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const schema = Yup.object({
      'bucketclassname-input': Yup.string()
        .required()
        .min(3, fieldRequirements[0])
        .max(63, fieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          fieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          fieldRequirements[2]
        )
        .test(
          'avoid-ip-address',
          fieldRequirements[3],
          (value: string) => !isValidIP(value)
        )
        .test(
          'unique-name',
          fieldRequirements[4],
          (value: string) => !existingNames.includes(value)
        ),
    });

    return { schema, fieldRequirements };
  }, [data, loadError, loaded, t]);

  const resolver = useYupValidationResolver(schema);
  const {
    control,
    formState: { isValid },
    watch,
  } = useForm({
    ...formSettings,
    resolver,
  });

  const bucketClassName: string = watch('bucketclassname-input');

  React.useEffect(() => {
    dispatch({
      type: 'setBucketClassName',
      name: isValid ? bucketClassName : '',
    });
  }, [bucketClassName, dispatch, isValid]);

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
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements}
          popoverProps={{
            headerContent: t('Name requirements'),
            footerContent: `${t('Example')}: my-multi-cloud-mirror`,
          }}
          formGroupProps={{
            className: 'nb-create-bc-step-page-form__element',
            fieldId: 'bucketclassname-input',
            label: t('BucketClass name'),
            isRequired: true,
          }}
          textInputProps={{
            name: 'bucketclassname-input',
            'data-test': 'bucket-class-name',
            placeholder: t('my-multi-cloud-mirror'),
            type: 'text',
            id: 'bucketclassname-input',
            value: state.bucketClassName,
            'aria-label': t('BucketClass Name'),
          }}
        />
        <FormGroup
          className="nb-create-bc-step-page-form__element"
          fieldId="bc-description"
          label={t('Description (Optional)')}
        >
          <TextArea
            data-test="bucket-class-description"
            id="bc-description"
            value={state.description}
            onChange={(_event, description) =>
              dispatch({ type: 'setDescription', value: description })
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
  namespace: string;
};
