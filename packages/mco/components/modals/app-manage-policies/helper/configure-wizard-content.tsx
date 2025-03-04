import * as React from 'react';
import { DRApplication } from '@odf/mco/constants';
import { useCustomTranslation } from '@odf/shared';
import NameInput from '@odf/shared/input-with-requirements/nameInputWithValidation';
import { TFunction } from 'react-i18next';
import {
  Alert,
  AlertVariant,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
} from '@patternfly/react-core';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import { VMProtectionMethodType } from '../utils/types';

const RADIO_GROUP_NAME = 'vm_protection_method';

const ProtectionNameInput: React.FC<ProtectionNameInputProps> = ({
  vmProtectionName,
  existingProtectionNames,
  dispatch,
}) => {
  const setProtectionName = (newName: string) =>
    dispatch({
      type: ManagePolicyStateType.SET_VM_PROTECTION_NAME,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: newName,
    });

  return (
    <NameInput
      name={vmProtectionName}
      existingNames={existingProtectionNames}
      onChange={setProtectionName}
    />
  );
};

const getRadioOptions = (
  isDiscoveredApp: boolean,
  protectionName: string,
  existingProtectionNames: string[],
  dispatch: React.Dispatch<ManagePolicyStateAction>,
  t: TFunction
): RadioOption[] => {
  const options: RadioOption[] = [
    {
      id: 'standalone-vm-protection',
      value: VMProtectionMethodType.STANDALONE,
      description: t(
        'Protect this VM independently without associating it with an existing DR placement control.'
      ),
      label: t('Standalone'),
      isDisabled: false,
      ...(isDiscoveredApp && {
        componentRef: (
          <ProtectionNameInput
            vmProtectionName={protectionName}
            existingProtectionNames={existingProtectionNames}
            dispatch={dispatch}
          />
        ),
      }),
    },
    {
      id: 'shared-vm-protection',
      value: VMProtectionMethodType.SHARED,
      description: t(
        'Add this VM to an existing DR placement control for consistent failover and recovery. This method is only available for discovered VMs.'
      ),
      label: t('Shared'),
      isDisabled: !isDiscoveredApp,
      ...(isDiscoveredApp && {
        componentRef: (
          <ProtectionNameInput
            vmProtectionName={protectionName}
            existingProtectionNames={existingProtectionNames}
            dispatch={dispatch}
          />
        ),
      }),
    },
  ];

  return options;
};

const ConfigureWizardContent: React.FC<ConfigureWizardContentProps> =
  React.memo(
    ({
      vmProtectionMethodType,
      vmProtectionName,
      appType,
      existingProtectionNames,
      dispatch,
    }) => {
      const { t } = useCustomTranslation();
      const isDiscoveredApp = appType === DRApplication.DISCOVERED;

      const setProtectionMethod = (
        event: React.ChangeEvent<HTMLInputElement>
      ) =>
        dispatch({
          type: ManagePolicyStateType.SET_VM_PROTECTION_METHOD,
          context: ModalViewContext.ASSIGN_POLICY_VIEW,
          payload: event.target.value as VMProtectionMethodType,
        });

      return (
        <Form>
          <FormGroup
            label={t('Some title here')}
            fieldId="vm-protection-method"
          >
            <FormHelperText className="pf-v5-u-mb-sm">
              <HelperText>
                <HelperTextItem variant="indeterminate">
                  {t('Choose how you would like to protect this VM:')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>

            {getRadioOptions(
              isDiscoveredApp,
              vmProtectionName,
              existingProtectionNames,
              dispatch,
              t
            ).map(
              ({ id, value, description, label, isDisabled, componentRef }) => (
                <Radio
                  key={id}
                  id={id}
                  name={RADIO_GROUP_NAME}
                  value={value}
                  description={description}
                  label={label}
                  onChange={setProtectionMethod}
                  isChecked={vmProtectionMethodType === value}
                  isDisabled={isDisabled}
                  className="pf-v5-u-mb-md"
                  body={componentRef}
                />
              )
            )}

            {!isDiscoveredApp && (
              <Alert
                title={t('Shared protection is not available for managed VMs.')}
                variant={AlertVariant.info}
                isInline
              />
            )}
          </FormGroup>
        </Form>
      );
    }
  );

type ConfigureWizardContentProps = {
  vmProtectionMethodType: VMProtectionMethodType;
  vmProtectionName: string;
  appType: DRApplication;
  existingProtectionNames: string[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};

type RadioOption = {
  id: string;
  value: VMProtectionMethodType;
  description: string;
  label: string;
  isDisabled: boolean;
  componentRef?: React.ReactNode;
};

type ProtectionNameInputProps = {
  vmProtectionName: string;
  existingProtectionNames: string[];
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};

export default ConfigureWizardContent;
