import * as React from 'react';
import { getName } from '@odf/shared/selectors';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { DRPolicyKind } from '../types';
import { getDRPolicyResourceObj } from './mco-resources';

export type DRPolicyInfo = {
  name: string;
  phase: string;
  schedulingInterval: string;
  isConfiguring: boolean;
  policy: DRPolicyKind;
};

export type ClusterPairKey = string; // Format: "cluster1::cluster2" (alphabetically sorted)

export type ClusterPairPoliciesMap = {
  [pairKey: ClusterPairKey]: DRPolicyInfo[];
};

/**
 * Creates a consistent key for a cluster pair (alphabetically sorted)
 */
export const createClusterPairKey = (
  cluster1: string,
  cluster2: string
): ClusterPairKey => {
  const [first, second] = [cluster1, cluster2].sort();
  return `${first}::${second}`;
};

/**
 * Hook to get DR policies grouped by cluster pairs.
 * Returns policies that connect two clusters.
 */
export const useDRPoliciesByClusterPair = (): [
  ClusterPairPoliciesMap,
  boolean,
  Error | null,
] => {
  const [drPolicies, loaded, loadError] = useK8sWatchResource<DRPolicyKind[]>(
    getDRPolicyResourceObj()
  );

  const clusterPairPoliciesMap = React.useMemo<ClusterPairPoliciesMap>(() => {
    const map: ClusterPairPoliciesMap = {};

    if (loaded && !loadError && drPolicies) {
      drPolicies.forEach((policy) => {
        const drClusters = policy.spec?.drClusters || [];

        // Only process policies with exactly 2 clusters
        if (drClusters.length !== 2) {
          return;
        }

        const [cluster1, cluster2] = drClusters;
        const pairKey = createClusterPairKey(cluster1, cluster2);
        const policyName = getName(policy);
        const phase = policy.status?.phase || 'Unknown';
        const schedulingInterval = policy.spec?.schedulingInterval || '';

        // Consider policy as configuring only if phase indicates an error or pending state
        // Any other phase (Available, Validated, Succeeded, etc.) is considered ready
        const configuringPhases = [
          'Pending',
          'Unknown',
          'Failed',
          'Error',
          'Configuring',
        ];
        const isConfiguring = configuringPhases.includes(phase);

        const policyInfo: DRPolicyInfo = {
          name: policyName,
          phase,
          schedulingInterval,
          isConfiguring,
          policy,
        };

        if (!map[pairKey]) {
          map[pairKey] = [];
        }
        map[pairKey].push(policyInfo);
      });
    }

    return map;
  }, [loaded, loadError, drPolicies]);

  return React.useMemo(
    () => [clusterPairPoliciesMap, loaded, loadError],
    [clusterPairPoliciesMap, loaded, loadError]
  );
};

/**
 * Extract cluster names from a pair key
 */
export const getClustersFromPairKey = (
  pairKey: ClusterPairKey
): [string, string] => {
  const [cluster1, cluster2] = pairKey.split('::');
  return [cluster1, cluster2];
};
