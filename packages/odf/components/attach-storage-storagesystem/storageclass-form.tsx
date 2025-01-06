import * as React from 'react';
import { StorageClassEncryptionKMSID } from '@odf/ocs/storage-class/sc-form';
import {
  fieldRequirementsTranslations,
  formSettings,
  getName,
  ReclaimPolicy,
  StorageClassModel,
  StorageClassResourceKind,
  TextInputWithFieldRequirements,
  useYupValidationResolver,
  VolumeBindingMode,
} from '@odf/shared';
import validationRegEx from '@odf/shared/utils/validation';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as Yup from 'yup';
import {
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInputTypes,
} from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons';
import {
  AttachStorageAction,
  AttachStorageActionType,
  AttachStorageFormState,
} from './state';

type StorageClassFormProps = {
  state: AttachStorageFormState;
  dispatch: React.Dispatch<AttachStorageAction>;
};

const StorageClassForm: React.FC<StorageClassFormProps> = ({
  state,
  dispatch,
}) => {
  const { t } = useTranslation();
  const [isReclaimOpen, setIsReclaimOpen] = React.useState(false);
  const [isVolumeBindingOpen, setIsVolumeBindingOpen] = React.useState(false);
  const onEncryptionChange = React.useCallback(() => {
    dispatch({
      type: AttachStorageActionType.SET_STORAGECLASS_ENCRYPTION,
      payload: !state.storageClassDetails.enableStorageClassEncryption,
    });
  }, [dispatch, state.storageClassDetails.enableStorageClassEncryption]);
  const onEncryptionKMSIDChange = (
    _id: string,
    paramName: string,
    _checkbox: boolean
  ) => {
    dispatch({
      type: AttachStorageActionType.SET_ENCRYPTION_KMS_ID,
      payload: paramName,
    });
  };

  const [data, loaded, loadError] = useK8sWatchResource<
    StorageClassResourceKind[]
  >({
    kind: StorageClassModel.kind,
    namespaced: false,
    isList: true,
  });

  const { schema, fieldRequirements } = React.useMemo(() => {
    const existingNames =
      loaded && !loadError ? data?.map((dataItem) => getName(dataItem)) : [];

    const fieldRequirements = [
      fieldRequirementsTranslations.maxChars(t, 253),
      fieldRequirementsTranslations.startAndEndName(t),
      fieldRequirementsTranslations.alphaNumericPeriodAdnHyphen(t),
      fieldRequirementsTranslations.cannotBeUsedBefore(t),
    ];

    const schema = Yup.object({
      'attach-storage-storageclass-name': Yup.string()
        .required()
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
          (value: string) => !existingNames.includes(value)
        ),
    });

    return { schema, fieldRequirements };
  }, [data, loadError, loaded, t]);

  const resolver = useYupValidationResolver(schema);
  const {
    control,
    formState: { isValid },
  } = useForm({
    ...formSettings,
    resolver,
  });

  const reclaimPolicyDropdownItems = React.useMemo(() => {
    return Object.values(ReclaimPolicy).map((policy) => (
      <DropdownItem
        key={`reclaim-policy-${policy}`}
        component="button"
        id={policy}
        data-test-id="reclaim-policy-dropdown-item"
        onClick={() =>
          dispatch({
            type: AttachStorageActionType.SET_STORAGECLASS_RECLAIM_POLICY,
            payload: policy,
          })
        }
      >
        {policy}
      </DropdownItem>
    ));
  }, [dispatch]);

  const volumeBindingModeDropdownItems = React.useMemo(() => {
    return Object.values(VolumeBindingMode).map((mode) => (
      <DropdownItem
        key={`volume-binding-mode-${mode}`}
        component="button"
        id={mode}
        data-test-id="volume-binding-dropdown-item"
        onClick={() =>
          dispatch({
            type: AttachStorageActionType.SET_STORAGECLASS_VOLUME_BINDING_MODE,
            payload: mode,
          })
        }
      >
        {mode}
      </DropdownItem>
    ));
  }, [dispatch]);

  return (
    <div className="odf-create-storage-class__form">
      <div className="form-group attachstorage-storageclass-dropdown__input">
        <label
          className="control-label co-required"
          htmlFor="reclaim-policy-dropdown"
        >
          {t('Reclaim Policy')}
        </label>
        <Dropdown
          className="dropdown--full-width"
          toggle={
            <DropdownToggle
              id="reclaim-policy-dropdown"
              data-test="reclaim-policy-dropdown"
              onToggle={() => setIsReclaimOpen(!isReclaimOpen)}
              toggleIndicator={CaretDownIcon}
            >
              {state.storageClassDetails.reclaimPolicy ||
                t('Select reclaim policy')}
            </DropdownToggle>
          }
          isOpen={isReclaimOpen}
          dropdownItems={reclaimPolicyDropdownItems}
          onSelect={() => setIsReclaimOpen(false)}
          id="reclaim-policy-dropdown"
        />
        <FormHelperText>
          <HelperText id="reclaim-policy-helper">
            <HelperTextItem>
              {t(
                "Determines what happens to persistent volumes when the associated persistent volume claim is deleted. Defaults to 'Delete'"
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </div>
      <div className="form-group attachstorage-storageclass-dropdown__input">
        <label
          className="control-label co-required"
          htmlFor="volume-binding-mode-dropdown"
        >
          {t('Volume Binding Mode')}
        </label>
        <Dropdown
          className="dropdown--full-width"
          toggle={
            <DropdownToggle
              id="volume-binding-mode-dropdown"
              data-test="volume-binding-mode-dropdown"
              onToggle={() => setIsVolumeBindingOpen(!isVolumeBindingOpen)}
              toggleIndicator={CaretDownIcon}
            >
              {state.storageClassDetails.volumeBindingMode ||
                t('Select VolumeBinding Mode')}
            </DropdownToggle>
          }
          isOpen={isVolumeBindingOpen}
          dropdownItems={volumeBindingModeDropdownItems}
          onSelect={() => setIsVolumeBindingOpen(false)}
          id="volume-binding-mode-dropdown"
        />
        <FormHelperText>
          <HelperText id="volume-binding-helper">
            <HelperTextItem>
              {t(
                "Determines what persistent volume claims will be provisioned and bound. Defaults to 'WaitForFirstCustomer'"
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </div>
      <FormGroup
        className="attachstorage-storageclass__text-input "
        fieldId="attachstorage-storageclass"
      >
        <TextInputWithFieldRequirements
          control={control}
          fieldRequirements={fieldRequirements}
          defaultValue={state.storageClassDetails.name}
          popoverProps={{
            headerContent: t('Name requirements'),
            footerContent: `${t('Example')}: my-storage-class`,
          }}
          formGroupProps={{
            label: t('New StorageClass name'),
            fieldId: 'attach-storage-storageclass-name',
          }}
          textInputProps={{
            id: 'attach-storage-storageclass-name',
            name: 'attach-storage-storageclass-name',
            type: TextInputTypes.text,
            value: state.storageClassDetails.name,
            placeholder: 'Enter a unique StorageClass name',
            'data-test': 'attach-storage-storageclass-name',
            isRequired: true,
            onChange: (_event, val) => {
              dispatch({
                type: AttachStorageActionType.SET_STORAGECLASS_NAME,
                payload: isValid ? val : '',
              });
            },
          }}
        />
      </FormGroup>
      <FormGroup>
        <Checkbox
          id="enable-encryption-storage-class"
          label={t('Enable encryption on StorageClass')}
          className="pf-v5-u-pt-md"
          isChecked={state.storageClassDetails.enableStorageClassEncryption}
          onChange={onEncryptionChange}
        />
        {!!state.storageClassDetails.enableStorageClassEncryption && (
          <StorageClassEncryptionKMSID
            onParamChange={onEncryptionKMSIDChange}
            parameterKey=""
            parameterValue={state.storageClassDetails.encryptionKMSID}
          />
        )}
      </FormGroup>
    </div>
  );
};

export default StorageClassForm;
