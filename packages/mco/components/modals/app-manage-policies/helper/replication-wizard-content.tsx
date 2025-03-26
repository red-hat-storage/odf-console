import * as React from 'react';
import {
  PolicyInfo,
  ReplicationSelectionHelper,
} from '@odf/mco/components/discovered-application-wizard/wizard-steps/replication-step/replication-selection-helper';
import { getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import { DRPolicyType } from '../utils/types';
import { findPolicy } from './select-policy-wizard-content';

// Convert DRPolicyType to PolicyInfo
const convertToPolicyInfo = (policy?: DRPolicyType): PolicyInfo =>
  policy
    ? {
        name: getName(policy),
        drClusters: policy?.drClusters || [],
        schedulingInterval: policy?.schedulingInterval || '0m',
        isValidated: !!policy?.isValidated,
      }
    : ({} as PolicyInfo);

export const ReplicationTypeWizardContent: React.FC<
  ReplicationTypeWizardContentProps
> = ({
  policy,
  k8sResourceSyncInterval,
  matchingPolicies,
  isValidationEnabled,
  dispatch,
  isSharedVMProtection,
}) => {
  // Convert all policies to PolicyInfoBase before filtering
  const convertedPolicies = matchingPolicies.map(convertToPolicyInfo);

  const setK8sSyncInterval = (syncInterval: string) => {
    dispatch({
      type: ManagePolicyStateType.SET_K8S_SYNC_INTERVAL,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: syncInterval,
    });
  };

  const setSelectedPolicy = (policyName: string) => {
    dispatch({
      type: ManagePolicyStateType.SET_SELECTED_POLICY_FOR_REPLICATION,
      context: ModalViewContext.ASSIGN_POLICY_VIEW,
      payload: findPolicy(policyName, matchingPolicies),
    });
  };

  return (
    <ReplicationSelectionHelper
      policy={convertToPolicyInfo(policy)}
      eligiblePolicies={convertedPolicies}
      k8sResourceReplicationInterval={k8sResourceSyncInterval}
      isValidationEnabled={isValidationEnabled}
      onK8sSyncIntervalChange={setK8sSyncInterval}
      onPolicyChange={setSelectedPolicy}
      isDisable={isSharedVMProtection}
    />
  );
};

type ReplicationTypeWizardContentProps = {
  policy: DRPolicyType;
  k8sResourceSyncInterval: string;
  matchingPolicies: DRPolicyType[];
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  isSharedVMProtection: boolean;
};
