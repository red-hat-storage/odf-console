import * as React from 'react';
import { ReclaimPolicy, VolumeBindingMode } from '@odf/shared';
import {
  Dropdown,
  DropdownItem,
  DropdownToggle,
} from '@patternfly/react-core/deprecated';
import { useTranslation } from 'react-i18next';
import {
  Checkbox,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
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
        <label
          className="control-label co-required"
          htmlFor="storageclass-name-input"
        >
          {t('New StorageClass name')}
        </label>
        <TextInput
          data-test="storageclass-name-text"
          id="storageclass-name"
          data-testid="storageclass-name"
          value={state.storageClassDetails.name}
          type="text"
          placeholder={t('Enter a unique StorageClass name')}
          onChange={(_event, val: string) => {
            dispatch({
              type: AttachStorageActionType.SET_STORAGECLASS_NAME,
              payload: val,
            });
          }}
          isRequired
        />
      </FormGroup>
      <FormGroup>
        <Checkbox
          id="enable-encryption-device-set"
          label={t('Enable encryption on StorageClass')}
          className="pf-v5-u-pt-md"
          isChecked={state.storageClassDetails.enableStorageClassEncryption}
          onChange={onEncryptionChange}
        />
      </FormGroup>
    </div>
  );
};

export default StorageClassForm;
