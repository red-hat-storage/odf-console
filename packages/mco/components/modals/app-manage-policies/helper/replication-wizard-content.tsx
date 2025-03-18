import * as React from 'react';
import {
  PolicyInfo,
  ReplicationSelectionHelper,
} from '@odf/mco/components/discovered-application-wizard/wizard-steps/replication-step/replication-selection-helper';
import { useACMSafeFetch } from '@odf/mco/hooks';
import { queryAppWorkloadPVCs } from '@odf/mco/utils';
import { StatusBox } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import {
  ManagePolicyStateAction,
  ManagePolicyStateType,
  ModalViewContext,
} from '../utils/reducer';
import { DRPolicyType, PVCQueryFilter } from '../utils/types';
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
  pvcQueryFilter,
  dispatch,
  isSharedVMProtection,
}) => {
  // TODO: Temporary place for the PVC search API in Discovered apps
  // ACM search proxy API call
  const searchQuery = React.useMemo(
    () => queryAppWorkloadPVCs(pvcQueryFilter),
    [pvcQueryFilter]
  );
  const [searchResult, searchLoadError, searchLoaded] =
    useACMSafeFetch(searchQuery);

  // VM Persistent Volume Claims (PVCs)
  React.useEffect(() => {
    if (searchLoaded && !searchLoadError) {
      dispatch({
        type: ManagePolicyStateType.SET_VM_PVCS,
        context: ModalViewContext.ASSIGN_POLICY_VIEW,
        payload:
          searchResult?.data?.searchResult?.[0]?.related?.[0]?.items?.map(
            (vm) => vm.name
          ) || [],
      });
    }
  }, [searchResult, searchLoadError, searchLoaded, dispatch]);

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

  return searchLoaded && !searchLoadError ? (
    <ReplicationSelectionHelper
      policy={convertToPolicyInfo(policy)}
      eligiblePolicies={convertedPolicies}
      k8sResourceReplicationInterval={k8sResourceSyncInterval}
      isValidationEnabled={isValidationEnabled}
      onK8sSyncIntervalChange={setK8sSyncInterval}
      onPolicyChange={setSelectedPolicy}
      isDisable={isSharedVMProtection}
    />
  ) : (
    <StatusBox loaded={searchLoaded} loadError={searchLoadError} />
  );
};

type ReplicationTypeWizardContentProps = {
  policy: DRPolicyType;
  k8sResourceSyncInterval: string;
  matchingPolicies: DRPolicyType[];
  isValidationEnabled: boolean;
  pvcQueryFilter: PVCQueryFilter;
  dispatch: React.Dispatch<ManagePolicyStateAction>;
  isSharedVMProtection: boolean;
};
