import * as React from 'react';
import { ReplicationType } from '@odf/mco/constants';
import { getDRPolicyStatus } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown/singleselectdropdown';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { SelectOption } from '@patternfly/react-core/deprecated';
import { TFunction } from 'react-i18next';
import {
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import { DRPolicyType } from '../utils/types';

const getDropdownOptions = (dataPolicies: DRPolicyType[], t: TFunction) =>
  dataPolicies.map((policy) => (
    <SelectOption
      key={getName(policy)}
      value={getName(policy)}
      description={
        policy.replicationType === ReplicationType.ASYNC
          ? t(
              'Replication type: {{type}}, Interval: {{interval}}, Clusters: {{clusters}}',
              {
                type: policy.replicationType,
                interval: policy.schedulingInterval,
                clusters: policy.drClusters.join(', '),
              }
            )
          : t('Replication type: {{type}}, Clusters: {{clusters}}', {
              type: policy.replicationType,
              clusters: policy.drClusters.join(', '),
            })
      }
    />
  ));

export const findPolicy = (name: string, dataPolicies: DRPolicyType[]) =>
  dataPolicies.find((policy) => getName(policy) === name);

export const SelectPolicyWizardContent: React.FC<
  SelectPolicyWizardContentProps
> = ({ policy, matchingPolicies, isValidationEnabled, dispatch }) => {
  const { t } = useCustomTranslation();
  const name = getName(policy);
  const isInvalidPolicy = isValidationEnabled && !name;
  return (
    <Form className="mco-manage-policies__form--width">
      <FormGroup
        fieldId="policy-type-selector"
        label={t('Policy name')}
        isRequired
      >
        <SingleSelectDropdown
          placeholderText={t('Select a policy')}
          selectOptions={getDropdownOptions(matchingPolicies, t)}
          id="policy-selection-dropdown"
          selectedKey={name}
          validated={getValidatedProp(isInvalidPolicy)}
          required
          onChange={(value: string) => {
            if (name !== value) {
              dispatch({
                type: ManagePolicyStateType.SET_SELECTED_POLICY,
                context: ModalViewContext.ASSIGN_POLICY_VIEW,
                payload: findPolicy(value, matchingPolicies),
              });
            }
          }}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {!!policy &&
                t('Status: {{status}}', {
                  status: getDRPolicyStatus(policy.isValidated, t),
                })}
            </HelperTextItem>
            {isInvalidPolicy && (
              <HelperTextItem variant={getValidatedProp(isInvalidPolicy)}>
                {t('Required')}
              </HelperTextItem>
            )}
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};

type SelectPolicyWizardContentProps = {
  policy: DRPolicyType;
  matchingPolicies: DRPolicyType[];
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
};
