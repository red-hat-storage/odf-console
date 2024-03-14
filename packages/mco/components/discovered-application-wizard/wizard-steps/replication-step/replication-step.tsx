import * as React from 'react';
import {
  MIN_VALUE,
  normalizeSyncTimeValue,
} from '@odf/mco/components/create-dr-policy/select-replication-type';
import {
  REPLICATION_DISPLAY_TEXT,
  SYNC_SCHEDULE_DISPLAY_TEXT,
} from '@odf/mco/constants';
import { DRPolicyModel } from '@odf/mco/models';
import { DRPolicyKind } from '@odf/mco/types';
import {
  getDRPolicyStatus,
  isDRPolicyValidated,
  parseSyncInterval,
} from '@odf/mco/utils';
import { SingleSelectDropdown } from '@odf/shared/dropdown';
import { FieldLevelHelp, StatusBox } from '@odf/shared/generic';
import { useK8sList } from '@odf/shared/hooks';
import { getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getValidatedProp } from '@odf/shared/utils';
import { RequestSizeInput } from '@odf/shared/utils/RequestSizeInput';
import { SelectOption } from '@patternfly/react-core/deprecated';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import {
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Text,
  TextVariants,
} from '@patternfly/react-core';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import { findAllEligiblePolicies } from '../namespace-step/namesapce-table';
import '../../enroll-discovered-application.scss';

const getPolicyOptions = (dataPolicies: DRPolicyKind[], t: TFunction) =>
  dataPolicies.map((policy) => (
    <SelectOption
      key={getName(policy)}
      value={getName(policy)}
      description={
        policy.spec.schedulingInterval !== '0m'
          ? t(
              'Replication type: {{type}}, Interval: {{interval}}, Clusters: {{clusters}}',
              {
                type: REPLICATION_DISPLAY_TEXT(t).async,
                interval: policy.spec.schedulingInterval,
                clusters: policy.spec.drClusters.join(', '),
              }
            )
          : t('Replication type: {{type}}, Clusters: {{clusters}}', {
              type: REPLICATION_DISPLAY_TEXT(t).sync,
              clusters: policy.spec.drClusters.join(', '),
            })
      }
    />
  ));

const PolicySelection: React.FC<PolicySelectionProps> = ({
  policy,
  clusterName,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const [drPolicies, loaded, loadError] =
    useK8sList<DRPolicyKind>(DRPolicyModel);

  // Filteting policy using cluster name
  const eligiblePolicies = findAllEligiblePolicies(
    clusterName,
    drPolicies || []
  );

  // Validated/Not Validated
  const translatedPolicyStatus = t('Status: {{status}}', {
    status: getDRPolicyStatus(isDRPolicyValidated(policy), t),
  });

  const policyValidated = getValidatedProp(
    (isValidationEnabled && _.isEmpty(policy)) || !eligiblePolicies.length
  );

  const helperTextInvalid = !eligiblePolicies.length
    ? t('No policy found')
    : t('Required');
  const helperText = !_.isEmpty(policy) && translatedPolicyStatus;

  const setSelectedPolicy = (policyName: string) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_POLICY,
      payload: eligiblePolicies.find(
        (currPolicy) => getName(currPolicy) === policyName
      ),
    });
  };

  return (
    <>
      {loaded && !loadError ? (
        <FormGroup
          className="pf-v5-u-w-50"
          fieldId="dr-policy-selection"
          label={t('Disaster recovery policy')}
          labelIcon={
            <FieldLevelHelp>
              {t('The policy sync interval is only applicable to volumes.')}
            </FieldLevelHelp>
          }
          isRequired
        >
          <SingleSelectDropdown
            id="dr-policy-dropdown"
            placeholderText={t('Select a policy')}
            selectedKey={getName(policy)}
            selectOptions={getPolicyOptions(eligiblePolicies, t)}
            onChange={setSelectedPolicy}
            validated={policyValidated}
            isDisabled={!eligiblePolicies.length}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant={policyValidated}>
                {policyValidated === 'error' ? helperTextInvalid : helperText}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      ) : (
        <StatusBox loaded={loaded} loadError={loadError} />
      )}
    </>
  );
};

export const ReplicationSelection: React.FC<ReplicationSelectionProps> = ({
  state,
  isValidationEnabled,
  dispatch,
}) => {
  const { t } = useCustomTranslation();

  const { clusterName } = state.namespace;
  const {
    drPolicy: policy,
    k8sResourceReplicationInterval: replicationInterval,
  } = state.replication;

  const SyncScheduleFormat = SYNC_SCHEDULE_DISPLAY_TEXT(t);
  const [unitVal, interval] = parseSyncInterval(replicationInterval);

  const setInterval = (props: { value: number; unit: string }) => {
    const { value, unit } = props;
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_REPLICATION_INTERVAL,
      payload: `${normalizeSyncTimeValue(value)}${unit}`,
    });
  };

  return (
    <Form maxWidth="58rem">
      <FormSection title={t('Volume and Kubernetes object replication')}>
        <Text component={TextVariants.small}>
          {t(
            'Define where to sync or replicate your application volumes and Kubernetes object using a disaster recovery policy.'
          )}
        </Text>
        <PolicySelection
          policy={policy}
          clusterName={clusterName}
          isValidationEnabled={isValidationEnabled}
          dispatch={dispatch}
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
          />
        </FormGroup>
      </FormSection>
    </Form>
  );
};

type ReplicationSelectionProps = {
  state: EnrollDiscoveredApplicationState;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};

type PolicySelectionProps = {
  policy: DRPolicyKind;
  clusterName: string;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
