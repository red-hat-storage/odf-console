import * as React from 'react';
import { getValidatedProp } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Form, FormGroup, SelectOption } from '@patternfly/react-core';
import { DRPolicyType, DataPolicyType } from '../utils/types';

const getDropdownOptions = (dataPolicies: DRPolicyType[]) =>
  dataPolicies.map((policy) => (
    <SelectOption key={getName(policy)} value={getName(policy)} />
  ));

const findPolicy = (name: string, dataPolicies: DRPolicyType[]) =>
  dataPolicies.find((policy) => getName(policy) === name);

export const SelectPolicyWizardContent: React.FC<SelectPolicyWizardContentProps> =
  ({ policy, matchingPolicies, isValidationEnabled, setPolicy }) => {
    const { t } = useCustomTranslation();
    const name = getName(policy);
    return (
      <Form className="mco-manage-policies__form--width">
        <FormGroup
          fieldId="policy-type-selector"
          label={t('Policy name')}
          isRequired
          validated={getValidatedProp(isValidationEnabled && !name)}
          helperTextInvalid={t('Required')}
        >
          <SingleSelectDropdown
            placeholderText={t('Select a policy')}
            selectOptions={getDropdownOptions(matchingPolicies)}
            id="policy-selection-dropdown"
            selectedKey={name}
            validated={getValidatedProp(isValidationEnabled && !name)}
            required
            onChange={(value: string) => {
              if (name !== value) {
                setPolicy(findPolicy(value, matchingPolicies));
              }
            }}
          />
        </FormGroup>
      </Form>
    );
  };

type SelectPolicyWizardContentProps = {
  policy: DataPolicyType;
  matchingPolicies: DRPolicyType[];
  isValidationEnabled: boolean;
  setPolicy: (policy: DataPolicyType) => void;
};
