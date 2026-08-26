import * as React from 'react';
import {
  GlobalnetStatus,
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_ADDON_NAME,
  SubmarinerStatus,
} from '@odf/mco/constants';
import {
  ACMManagedClusterKind,
  SubmarinerAddOnKind,
  SubmarinerBrokerKind,
  SubmarinerClusterKind,
} from '@odf/mco/types';
import {
  doesGlobalnetBlockProceed,
  evaluateGlobalnetPrePair,
  evaluateSubmarinerPrePair,
  type SubmarinerPrePairResult,
} from '@odf/mco/utils/submariner-health';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isNotFoundError,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  getManagedClusterResourceObj,
  getSubmarinerAddonListResourceObj,
  getSubmarinerBrokerListResourceObj,
  getSubmarinerClusterListResourceObj,
} from './mco-resources';

export type PrePairNetworkValidationState = SubmarinerPrePairResult & {
  loaded: boolean;
  loadError: unknown;
  globalnetStatus: GlobalnetStatus;
};

const idleState: PrePairNetworkValidationState = {
  loaded: true,
  loadError: null,
  canProceed: true,
  status: SubmarinerStatus.NotInstalled,
  globalnetStatus: GlobalnetStatus.Skipped,
};

type SubmarinerAddonsWatchResult = [
  Map<string, SubmarinerAddOnKind>,
  boolean,
  unknown,
];

const useSubmarinerAddons = (
  clusterNames: string[],
  enabled: boolean
): SubmarinerAddonsWatchResult => {
  const [addons, loaded, loadError] = useK8sWatchResource<
    SubmarinerAddOnKind[]
  >(
    getValidWatchK8sResourceObj(
      getSubmarinerAddonListResourceObj(),
      enabled && clusterNames.length === MAX_ALLOWED_CLUSTERS
    )
  );

  const addonByCluster = React.useMemo(() => {
    const byCluster = new Map<string, SubmarinerAddOnKind>();
    if (addons?.length) {
      for (const addon of addons) {
        const ns = addon.metadata?.namespace;
        if (
          ns &&
          clusterNames.includes(ns) &&
          getName(addon) === SUBMARINER_ADDON_NAME
        ) {
          byCluster.set(ns, addon);
        }
      }
    }
    return byCluster;
  }, [addons, clusterNames]);

  return [addonByCluster, loaded, loadError];
};

const useManagedClusterClaims = (clusterName: string, enabled: boolean) => {
  const [cluster, loaded] = useK8sWatchResource<ACMManagedClusterKind>(
    getValidWatchK8sResourceObj(
      getManagedClusterResourceObj({ name: clusterName }),
      enabled && !!clusterName
    )
  );
  return { clusterClaims: cluster?.status?.clusterClaims, loaded };
};

export const usePrePairNetworkValidation = (
  clusterNames: string[],
  enabled: boolean
): PrePairNetworkValidationState => {
  const clusterA = clusterNames[0];
  const clusterB = clusterNames[1];
  const shouldWatch = enabled && !!clusterA && !!clusterB;

  const [addonByCluster, addonsLoaded, addonsError] = useSubmarinerAddons(
    clusterNames,
    shouldWatch
  );
  const addonA = addonByCluster.get(clusterA);
  const addonB = addonByCluster.get(clusterB);

  const watchGlobalnet = shouldWatch && addonsLoaded && (!!addonA || !!addonB);

  const [brokers, brokersLoaded, brokersError] = useK8sWatchResource<
    SubmarinerBrokerKind[]
  >(
    getValidWatchK8sResourceObj(
      getSubmarinerBrokerListResourceObj(),
      watchGlobalnet
    )
  );
  const { clusterClaims: claimsA, loaded: managedClusterALoaded } =
    useManagedClusterClaims(clusterA || '', watchGlobalnet);
  const { clusterClaims: claimsB, loaded: managedClusterBLoaded } =
    useManagedClusterClaims(clusterB || '', watchGlobalnet);
  const [submarinerClusters, submarinerClustersLoaded] = useK8sWatchResource<
    SubmarinerClusterKind[]
  >(
    getValidWatchK8sResourceObj(
      getSubmarinerClusterListResourceObj(),
      watchGlobalnet
    )
  );

  if (!shouldWatch) {
    return idleState;
  }

  const { canProceed, status } = evaluateSubmarinerPrePair([
    { addon: addonA, loaded: addonsLoaded, loadError: addonsError },
    { addon: addonB, loaded: addonsLoaded, loadError: addonsError },
  ]);

  const globalnetStatus = evaluateGlobalnetPrePair(
    brokers,
    watchGlobalnet ? brokersLoaded : false,
    watchGlobalnet ? brokersError : null,
    [
      {
        clusterName: clusterA,
        clusterClaims: claimsA,
        loaded: watchGlobalnet ? managedClusterALoaded : false,
      },
      {
        clusterName: clusterB,
        clusterClaims: claimsB,
        loaded: watchGlobalnet ? managedClusterBLoaded : false,
      },
    ],
    submarinerClusters,
    watchGlobalnet ? submarinerClustersLoaded : false,
    status === SubmarinerStatus.NotInstalled
  );

  const loaded =
    addonsLoaded &&
    (!watchGlobalnet ||
      (brokersLoaded &&
        managedClusterALoaded &&
        managedClusterBLoaded &&
        submarinerClustersLoaded));

  const loadError =
    addonsError && !isNotFoundError(addonsError) ? addonsError : undefined;

  return {
    loaded,
    loadError,
    canProceed: canProceed && !doesGlobalnetBlockProceed(globalnetStatus),
    status,
    globalnetStatus,
  };
};
