import * as React from 'react';
import {
  fieldRequirementsTranslations,
  formSettings,
} from '@odf/shared/constants';
import { DEFAULT_DEVICECLASS } from '@odf/shared/constants';
import { TextInputWithFieldRequirements } from '@odf/shared/input-with-requirements';
import { DeviceSet } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import validationRegEx from '@odf/shared/utils/validation';
import { useYupValidationResolver } from '@odf/shared/yup-validation-resolver';
import { useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { TextInputTypes } from '@patternfly/react-core';
import {
  AttachStorageAction,
  AttachStorageActionType,
  AttachStorageFormState,
} from './state';

type DeviceClassFormProps = {
  state: AttachStorageFormState;
  dispatch: React.Dispatch<AttachStorageAction>;
  deviceSets: DeviceSet[];
  defaultDeviceClass: string;
};

const DeviceClassForm: React.FC<DeviceClassFormProps> = ({
  state,
  dispatch,
  deviceSets,
  defaultDeviceClass,
}) => {
  const { t } = useCustomTranslation();

  const existingDeviceClasses = React.useMemo(() => {
    if (!state.lsoStorageClassName) return [];

    return deviceSets
      .filter(
        (ds) =>
          ds.dataPVCTemplate?.spec?.storageClassName ===
          state.lsoStorageClassName
      )
      .map((ds) => ds.deviceClass || DEFAULT_DEVICECLASS);
  }, [deviceSets, state.lsoStorageClassName]);

  const deviceClassMaxLength = 253;
  const { schema, fieldRequirements } = React.useMemo(() => {
    const translationFieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, deviceClassMaxLength),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      'Choose a unique device class name that is not present in the device set.',
    ];

    const validationSchema = Yup.object({
      deviceClassName: Yup.string()
        .required()
        .max(deviceClassMaxLength, translationFieldRequirements[0])
        .matches(
          validationRegEx.startAndEndsWithAlphanumerics,
          translationFieldRequirements[1]
        )
        .matches(
          validationRegEx.alphaNumericsPeriodsHyphensNonConsecutive,
          translationFieldRequirements[2]
        )
        .test(
          'unique-device-class',
          translationFieldRequirements[3],
          (value: string) => {
            if (!value) return true;
            const isDuplicate = existingDeviceClasses.includes(value);
            return !isDuplicate;
          }
        ),
    });

    return {
      schema: validationSchema,
      fieldRequirements: translationFieldRequirements,
    };
  }, [existingDeviceClasses, t]);

  const resolver = useYupValidationResolver(schema);

  const defaultDeviceClassName = defaultDeviceClass;

  const {
    formState: { isValid },
    control,
    setValue,
  } = useForm({
    ...formSettings,
    resolver,
    defaultValues: {
      deviceClassName: '',
    },
  });

  React.useEffect(() => {
    if (!isValid) {
      // If the form is invalid, reset the deviceClass value in the reducer to an empty string.
      // Needed for disabling the "Attach" button.
      dispatch({
        type: AttachStorageActionType.SET_DEVICE_CLASS,
        payload: '',
      });
    }
  }, [isValid, dispatch]);

  /*This effect ensures that the default deviceClassName (computed from SC name and count)
    is always synced into the form when it changes */
  React.useEffect(() => {
    setValue('deviceClassName', defaultDeviceClassName, {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [defaultDeviceClassName, setValue]);

  return (
    <TextInputWithFieldRequirements
      control={control}
      fieldRequirements={fieldRequirements}
      popoverProps={{
        headerContent: t('Device class requirements'),
      }}
      formGroupProps={{
        label: t('Device class'),
        fieldId: 'device-class',
        className: 'pf-v6-u-py-sm',
        isRequired: true,
      }}
      textInputProps={{
        type: TextInputTypes.text,
        value: state.deviceClass,
        id: 'device-class',
        name: 'deviceClassName',
        'data-test': 'device-class-textbox',
        'aria-describedby': t('device class name'),
        placeholder: t('Enter device class'),
        isRequired: true,
        onChange: (_event, val) => {
          dispatch({
            type: AttachStorageActionType.SET_DEVICE_CLASS,
            payload: val,
          });
        },
      }}
    />
  );
};

export default DeviceClassForm;
