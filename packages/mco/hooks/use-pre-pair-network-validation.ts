import * as React from 'react';
import {
  GlobalnetStatus,
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_ADDON_NAME,
  SUBMARINER_OPERATOR_NAMESPACE,
  SubmarinerStatus,
} from '@odf/mco/constants';
import {
  ACMManagedClusterKind,
  SubmarinerAddOnKind,
  SubmarinerBrokerKind,
  SubmarinerClusterKind,
} from '@odf/mco/types';
import { startManagedClusterView } from '@odf/mco/utils/managed-cluster-view';
import {
  doesGlobalnetBlockProceed,
  evaluateGlobalnetPrePair,
  evaluateSubmarinerPrePair,
  SubmarinerPrePairResult,
} from '@odf/mco/utils/submariner-health';
import { SubmarinerModel } from '@odf/shared';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isNotFoundError,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
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

// MCV errors are swallowed for detection; avoid t() identity churn in the effect.
const passthroughT = ((key: string) => key) as TFunction;

const isAddonAbsent = (
  loaded: boolean,
  addon: SubmarinerAddOnKind | undefined,
  loadError: unknown
): boolean => loaded && !addon && (!loadError || isNotFoundError(loadError));

type UpstreamDetectionResult = {
  detected: boolean;
  pending: boolean;
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
      enabled &&
        clusterNames.length === MAX_ALLOWED_CLUSTERS &&
        clusterNames.every(Boolean)
    )
  );

  const addonByCluster = new Map<string, SubmarinerAddOnKind>();
  if (addons?.length) {
    for (const addon of addons) {
      const ns = addon.metadata?.namespace;
      if (
        ns &&
        clusterNames.includes(ns) &&
        getName(addon) === SUBMARINER_ADDON_NAME
      ) {
        addonByCluster.set(ns, addon);
      }
    }
  }

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

const useUpstreamSubmarinerDetection = (
  clusterName: string | undefined,
  enabled: boolean
): UpstreamDetectionResult => {
  const [result, setResult] = React.useState<UpstreamDetectionResult>({
    detected: false,
    pending: false,
  });

  React.useEffect(() => {
    if (!enabled || !clusterName) {
      setResult({ detected: false, pending: false });
      return;
    }

    let cancelled = false;
    let cancelRequest: () => void = () => undefined;
    setResult({ detected: false, pending: true });

    startManagedClusterView(
      {
        name: SUBMARINER_ADDON_NAME,
        namespace: SUBMARINER_OPERATOR_NAMESPACE,
        kind: SubmarinerModel.kind,
        version: SubmarinerModel.apiVersion,
        group: SubmarinerModel.apiGroup,
      },
      clusterName,
      passthroughT
    )
      .then(({ promise, cancel }) => {
        // Unmounted (or deps changed) while k8sCreate was in flight.
        if (cancelled) {
          cancel();
          return undefined;
        }
        cancelRequest = cancel;
        return promise;
      })
      .then((response) => {
        if (!cancelled && response) {
          setResult({
            detected: getName(response.result) === SUBMARINER_ADDON_NAME,
            pending: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ detected: false, pending: false });
        }
      });

    return () => {
      cancelled = true;
      cancelRequest();
    };
  }, [clusterName, enabled]);

  return result;
};

export const usePrePairNetworkValidation = (
  clusterNames: string[],
  enabled: boolean
): PrePairNetworkValidationState => {
  const clusterA = clusterNames[0];
  const clusterB = clusterNames[1];
  // Keep name guards so a future caller cannot enable watches with empty inputs.
  const shouldWatch = enabled && !!clusterA && !!clusterB;

  const [addonByCluster, addonsLoaded, addonsError] = useSubmarinerAddons(
    [clusterA || '', clusterB || ''],
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

  const shouldDetectUpstreamA =
    shouldWatch &&
    !!clusterA &&
    isAddonAbsent(addonsLoaded, addonA, addonsError);
  const shouldDetectUpstreamB =
    shouldWatch &&
    !!clusterB &&
    isAddonAbsent(addonsLoaded, addonB, addonsError);
  const upstreamA = useUpstreamSubmarinerDetection(
    clusterA,
    shouldDetectUpstreamA
  );
  const upstreamB = useUpstreamSubmarinerDetection(
    clusterB,
    shouldDetectUpstreamB
  );

  if (!shouldWatch) {
    return idleState;
  }

  const { canProceed, status } = evaluateSubmarinerPrePair([
    {
      addon: addonA,
      loaded: addonsLoaded && !upstreamA.pending,
      loadError: addonsError,
      upstreamDetected: upstreamA.detected,
    },
    {
      addon: addonB,
      loaded: addonsLoaded && !upstreamB.pending,
      loadError: addonsError,
      upstreamDetected: upstreamB.detected,
    },
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
    status === SubmarinerStatus.NotInstalled ||
      status === SubmarinerStatus.UpstreamDetected
  );

  const loaded =
    addonsLoaded &&
    !upstreamA.pending &&
    !upstreamB.pending &&
    (!watchGlobalnet ||
      (brokersLoaded &&
        managedClusterALoaded &&
        managedClusterBLoaded &&
        submarinerClustersLoaded));

  const loadError =
    addonsError && !isNotFoundError(addonsError) ? addonsError : undefined;

  // Non-404 load errors already map to Degraded / canProceed false in evaluate.
  return {
    loaded,
    loadError,
    canProceed: canProceed && !doesGlobalnetBlockProceed(globalnetStatus),
    status,
    globalnetStatus,
  };
};
