import * as React from 'react';
import { useRamenConfig } from '@odf/mco/hooks';
import { DRPolicyKind } from '@odf/mco/types';
import { isDRPolicyValidated } from '@odf/mco/utils';
import { DRPolicyModel } from '@odf/shared';
import { StatusBox } from '@odf/shared/generic';
import { useK8sList } from '@odf/shared/hooks';
import { getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import {
  EnrollDiscoveredApplicationAction,
  EnrollDiscoveredApplicationState,
  EnrollDiscoveredApplicationStateType,
} from '../../utils/reducer';
import { findAllEligiblePolicies } from '../namespace-step/namespace-table';
import {
  PolicyInfo,
  ReplicationSelectionHelper,
} from './replication-selection-helper';

// Convert DRPolicyKind to PolicyInfo
const convertToPolicyInfo = (policy?: DRPolicyKind): PolicyInfo =>
  !_.isEmpty(policy)
    ? {
        name: getName(policy),
        drClusters: policy?.spec?.drClusters || [],
        schedulingInterval: policy?.spec?.schedulingInterval || '0m',
        isValidated: isDRPolicyValidated(policy),
      }
    : ({} as PolicyInfo);

export const ReplicationSelection: React.FC<ReplicationSelectionProps> = ({
  state,
  isValidationEnabled,
  dispatch,
}) => {
  const { clusterName } = state.namespace;
  const { drPolicy, k8sResourceReplicationInterval, retainNamespaceSCC } =
    state.replication;

  const [drPolicies, loaded, loadError] =
    useK8sList<DRPolicyKind>(DRPolicyModel);

  const [ramenConfig] = useRamenConfig();
  const retainNamespaceSCCAcrossPeers =
    ramenConfig?.retainNamespaceSCCAcrossPeers;

  // Filtering policies using cluster name
  const eligiblePolicies = React.useMemo(() => {
    if (loaded && !loadError) {
      return findAllEligiblePolicies(clusterName, drPolicies);
    }
    return [];
  }, [clusterName, drPolicies, loaded, loadError]);

  // Convert all policies to PolicyInfo before filtering
  const convertedPolicies = eligiblePolicies.map(convertToPolicyInfo);

  const setK8sSyncInterval = (syncInterval: string) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_K8S_RESOURCE_REPLICATION_INTERVAL,
      payload: syncInterval,
    });
  };

  const setSelectedPolicy = (policyName: string) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_POLICY,
      payload: drPolicies.find(
        (currPolicy) => getName(currPolicy) === policyName
      ),
    });
  };

  const setRetainNamespaceSCC = (checked: boolean) => {
    dispatch({
      type: EnrollDiscoveredApplicationStateType.SET_RETAIN_NAMESPACE_SCC,
      payload: checked,
    });
  };

  return loaded && !loadError ? (
    <ReplicationSelectionHelper
      policy={convertToPolicyInfo(drPolicy)}
      eligiblePolicies={convertedPolicies}
      k8sResourceReplicationInterval={k8sResourceReplicationInterval}
      isValidationEnabled={isValidationEnabled}
      onK8sSyncIntervalChange={setK8sSyncInterval}
      onPolicyChange={setSelectedPolicy}
      retainNamespaceSCCAcrossPeers={retainNamespaceSCCAcrossPeers}
      retainNamespaceSCC={retainNamespaceSCC}
      onRetainNamespaceSCCChange={setRetainNamespaceSCC}
    />
  ) : (
    <StatusBox loaded={loaded} loadError={loadError} />
  );
};

type ReplicationSelectionProps = {
  state: EnrollDiscoveredApplicationState;
  isValidationEnabled: boolean;
  dispatch: React.Dispatch<EnrollDiscoveredApplicationAction>;
};
