import * as React from 'react';
import {
  MIN_VALUE,
  normalizeSyncTimeValue,
} from '@odf/mco/components/create-dr-policy/select-replication-type';
import {
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { getDRPolicyStatus, parseSyncInterval } from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { FieldLevelHelp } from '@odf/shared/generic';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import {
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Content,
  ContentVariants,
  SelectOption,
} from '@patternfly/react-core';

// Get Policy Dropdown Options
const getPolicyOptions = (policies: PolicyInfo[], t: TFunction) =>
  policies.map((policy) => (
    <SelectOption
      key={policy.name}
      value={policy.name}
      description={
        policy.schedulingInterval !== '0m'
          ? t(
              'Replication type: {{type}}, Interval: {{interval}}, Clusters: {{clusters}}',
              {
                type: REPLICATION_DISPLAY_TEXT(t).async,
                interval: policy.schedulingInterval,
                clusters: policy.drClusters.join(', '),
              }
            )
          : t('Replication type: {{type}}, Clusters: {{clusters}}', {
              type: REPLICATION_DISPLAY_TEXT(t).sync,
              clusters: policy.drClusters.join(', '),
            })
      }
    >
      {policy.name}
    </SelectOption>
  ));

// Policy Selection Component
const PolicySelection: React.FC<PolicySelectionProps> = ({
  policy,
  eligiblePolicies,
  isValidationEnabled,
  onChange,
  isDisable,
}) => {
  const { t } = useCustomTranslation();
  const translatedPolicyStatus = t('Status: {{status}}', {
    status: getDRPolicyStatus(policy?.isValidated, t),
  });

  const policyValidated = getValidatedProp(
    (isValidationEnabled && _.isEmpty(policy)) || !eligiblePolicies.length
  );

  const helperTextInvalid = !eligiblePolicies.length
    ? t('No policy found')
    : t('Required');
  const helperText = !_.isEmpty(policy) && translatedPolicyStatus;

  return (
    <FormGroup
      className="pf-v6-u-w-50"
      fieldId="dr-policy-selection"
      label={t('Disaster recovery policy')}
      labelHelp={
        <FieldLevelHelp>
          {t('The policy sync interval is only applicable to volumes.')}
        </FieldLevelHelp>
      }
      isRequired
    >
      <SingleSelectDropdown
        id="dr-policy-dropdown"
        placeholderText={t('Select a policy')}
        selectedKey={policy?.name}
        selectOptions={getPolicyOptions(eligiblePolicies, t)}
        onChange={onChange}
        validated={policyValidated}
        isDisabled={!eligiblePolicies.length || isDisable}
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={policyValidated}>
            {policyValidated === 'error' ? helperTextInvalid : helperText}
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};

// Replication Selection Component
export const ReplicationSelectionHelper: React.FC<
  ReplicationSelectionHelperProps
> = ({
  eligiblePolicies,
  policy,
  k8sResourceReplicationInterval,
  isValidationEnabled,
  onK8sSyncIntervalChange,
  onPolicyChange,
  isDisable,
}) => {
  const { t } = useCustomTranslation();
  const SyncScheduleFormat = SYNC_SCHEDULE_DISPLAY_TEXT(t);
  const [unitVal, interval] = parseSyncInterval(k8sResourceReplicationInterval);

  const setInterval = (props: { value: number; unit: string }) => {
    onK8sSyncIntervalChange(
      `${normalizeSyncTimeValue(props.value)}${props.unit}`
    );
  };

  return (
    <Form maxWidth="58rem">
      <FormSection title={t('Volume and Kubernetes object replication')}>
        <Content component={ContentVariants.small}>
          {t(
            'Define where to sync or replicate your application volumes and Kubernetes object using a disaster recovery policy.'
          )}
        </Content>
        <PolicySelection
          policy={policy}
          eligiblePolicies={eligiblePolicies}
          isValidationEnabled={isValidationEnabled}
          onChange={onPolicyChange}
          isDisable={isDisable}
        />
        <FormGroup
          fieldId="k8s-resource-interval-selection"
          label={t('Kubernetes object replication interval')}
        >
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                {t('Define the interval for Kubernetes object replication')}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
          <RequestSizeInput
            name={t('Replication interval')}
            onChange={setInterval}
            dropdownUnits={SyncScheduleFormat}
            defaultRequestSizeUnit={unitVal}
            defaultRequestSizeValue={interval.toString()}
            minValue={MIN_VALUE}
            isInputDisabled={isDisable}
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

// Common Policy Type
export type PolicyInfo = {
  name: string;
  drClusters: string[];
  schedulingInterval: string;
  isValidated: boolean;
};

// Props
type ReplicationSelectionHelperProps = {
  eligiblePolicies: PolicyInfo[];
  policy: PolicyInfo;
  k8sResourceReplicationInterval: string;
  isValidationEnabled: boolean;
  onPolicyChange: (policyName: string) => void;
  onK8sSyncIntervalChange: (syncInterval: string) => void;
  isDisable?: boolean;
};

type PolicySelectionProps = {
  policy: PolicyInfo;
  eligiblePolicies: PolicyInfo[];
  isValidationEnabled: boolean;
  onChange: (policyName: string) => void;
  isDisable?: boolean;
};
