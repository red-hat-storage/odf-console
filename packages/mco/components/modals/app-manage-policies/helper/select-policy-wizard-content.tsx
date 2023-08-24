import * as React from 'react';
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
  ({ policy, matchingPolicies, setPolicy }) => {
    const { t } = useCustomTranslation();
    return (
      <Form className="mco-manage-policies__form--width">
        <FormGroup
          fieldId="policy-type-selector"
          label={t('Policy name')}
          isRequired
        >
          <SingleSelectDropdown
            placeholderText={t('Select a policy')}
            selectOptions={getDropdownOptions(matchingPolicies)}
            id="policy-selection-dropdown"
            selectedKey={getName(policy)}
            isDisabled={!matchingPolicies?.length}
            onChange={(value: string) => {
              if (getName(policy) !== value) {
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
  setPolicy: (policy: DataPolicyType) => void;
};
