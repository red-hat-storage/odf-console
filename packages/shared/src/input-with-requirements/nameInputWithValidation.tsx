import * as React from 'react';
import validationRegEx from '@odf/shared/utils/validation';
import { useForm } from 'react-hook-form';
import { TFunction } from 'react-i18next';
import * as Yup from 'yup';
import { fieldRequirementsTranslations, formSettings } from '../constants';
import { useCustomTranslation } from '../useCustomTranslationHook';
import { useYupValidationResolver } from '../yup-validation-resolver';
import TextInputWithFieldRequirements from './TextInputWithFieldRequirements';

const getInputValidationSchema = (t: TFunction, existingNames: string[]) => {
  const fieldRequirements = [
    fieldRequirementsTranslations.maxChars(t, 63),
    fieldRequirementsTranslations.startAndEndName(t),
    fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
    fieldRequirementsTranslations.cannotBeUsedBefore(t),
  ];

  return {
    schema: Yup.object({
      'name-input': Yup.string()
        .required()
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
          'unique-name',
          fieldRequirements[3],
          (value: string) => !existingNames.includes(value)
        ),
    }),
    fieldRequirements,
  };
};

const NameInput: React.FC<NameInputProps> = ({
  name,
  existingNames = [],
  onChange,
  helperText,
  fieldId = 'name-input',
  dataTest = 'name-input',
}) => {
  const { t } = useCustomTranslation();
  const { schema, fieldRequirements } = React.useMemo(
    () => getInputValidationSchema(t, existingNames),
    [t, existingNames]
  );

  const resolver = useYupValidationResolver(schema);
  const {
    control,
    watch,
    formState: { isValid },
  } = useForm({ ...formSettings, resolver });

  const newName = watch(fieldId);

  React.useEffect(() => {
    onChange(isValid ? newName : '');
  }, [isValid, name, onChange]);

  return (
    <TextInputWithFieldRequirements
      control={control}
      fieldRequirements={fieldRequirements}
      defaultValue={name}
      popoverProps={{
        headerContent: t('Name requirements'),
        footerContent: `${t('Example')}: my-name`,
      }}
      formGroupProps={{
        className: 'pf-v5-u-w-50',
        label: t('Name'),
        fieldId,
        isRequired: true,
      }}
      textInputProps={{
        id: fieldId,
        name: fieldId,
        placeholder: t('Enter a unique name'),
        'data-test': dataTest,
        'aria-label': t('Name input'),
      }}
      helperText={helperText}
    />
  );
};

export type NameInputProps = {
  name: string;
  onChange: (text: string) => void;
  existingNames?: string[];
  helperText?: string;
  fieldId?: string;
  dataTest?: string;
};

export default NameInput;
