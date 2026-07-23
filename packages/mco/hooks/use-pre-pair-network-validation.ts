import * as React from 'react';
import {
  GlobalnetStatus,
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_ADDON_NAME,
  SUBMARINER_GVK,
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
} from '@odf/mco/utils/submariner-health';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isNotFoundError,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  getManagedClusterResourceObj,
  getSubmarinerAddonListResourceObj,
  getSubmarinerBrokerListResourceObj,
  getSubmarinerClusterListResourceObj,
} from './mco-resources';

export type PrePairNetworkValidationState = {
  loaded: boolean;
  loadError: unknown;
  canProceed: boolean;
  status: SubmarinerStatus;
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
    let cancelRequest = () => {};
    setResult({ detected: false, pending: true });

    startManagedClusterView(
      SUBMARINER_ADDON_NAME,
      SUBMARINER_OPERATOR_NAMESPACE,
      SUBMARINER_GVK.kind,
      SUBMARINER_GVK.version,
      SUBMARINER_GVK.group,
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
  const shouldWatch = enabled && clusterNames.length === MAX_ALLOWED_CLUSTERS;

  const [addonsA, loadedA, errorA] = useK8sWatchResource<SubmarinerAddOnKind[]>(
    getValidWatchK8sResourceObj(
      getSubmarinerAddonListResourceObj(clusterA || ''),
      shouldWatch && !!clusterA
    )
  );
  const [addonsB, loadedB, errorB] = useK8sWatchResource<SubmarinerAddOnKind[]>(
    getValidWatchK8sResourceObj(
      getSubmarinerAddonListResourceObj(clusterB || ''),
      shouldWatch && !!clusterB
    )
  );
  const addonA = addonsA?.find(
    (addon) => getName(addon) === SUBMARINER_ADDON_NAME
  );
  const addonB = addonsB?.find(
    (addon) => getName(addon) === SUBMARINER_ADDON_NAME
  );

  const watchGlobalnet =
    shouldWatch && ((loadedA && !!addonA) || (loadedB && !!addonB));

  const [brokers, brokersLoaded, brokersError] = useK8sWatchResource<
    SubmarinerBrokerKind[]
  >(
    getValidWatchK8sResourceObj(
      getSubmarinerBrokerListResourceObj(),
      watchGlobalnet
    )
  );
  const [managedClusterA, managedClusterALoaded] =
    useK8sWatchResource<ACMManagedClusterKind>(
      getValidWatchK8sResourceObj(
        getManagedClusterResourceObj({ name: clusterA }),
        watchGlobalnet && !!clusterA
      )
    );
  const [managedClusterB, managedClusterBLoaded] =
    useK8sWatchResource<ACMManagedClusterKind>(
      getValidWatchK8sResourceObj(
        getManagedClusterResourceObj({ name: clusterB }),
        watchGlobalnet && !!clusterB
      )
    );
  const [submarinerClusters, submarinerClustersLoaded] =
    useK8sWatchResource<SubmarinerClusterKind[]>(
      getValidWatchK8sResourceObj(
        getSubmarinerClusterListResourceObj(),
        watchGlobalnet
      )
    );

  const shouldDetectUpstreamA =
    shouldWatch && !!clusterA && isAddonAbsent(loadedA, addonA, errorA);
  const shouldDetectUpstreamB =
    shouldWatch && !!clusterB && isAddonAbsent(loadedB, addonB, errorB);
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
      loaded: loadedA && !upstreamA.pending,
      loadError: errorA,
      upstreamDetected: upstreamA.detected,
    },
    {
      addon: addonB,
      loaded: loadedB && !upstreamB.pending,
      loadError: errorB,
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
        clusterClaims: managedClusterA?.status?.clusterClaims,
        loaded: watchGlobalnet ? managedClusterALoaded : false,
      },
      {
        clusterName: clusterB,
        clusterClaims: managedClusterB?.status?.clusterClaims,
        loaded: watchGlobalnet ? managedClusterBLoaded : false,
      },
    ],
    submarinerClusters,
    watchGlobalnet ? submarinerClustersLoaded : false,
    status === SubmarinerStatus.NotInstalled ||
      status === SubmarinerStatus.UpstreamDetected
  );

  const loaded =
    loadedA &&
    loadedB &&
    !upstreamA.pending &&
    !upstreamB.pending &&
    (!watchGlobalnet ||
      (brokersLoaded &&
        managedClusterALoaded &&
        managedClusterBLoaded &&
        submarinerClustersLoaded));

  const loadError = [errorA, errorB].find(
    (error) => error && !isNotFoundError(error)
  );

  return {
    loaded,
    loadError,
    canProceed:
      !loadError && canProceed && !doesGlobalnetBlockProceed(globalnetStatus),
    status,
    globalnetStatus,
  };
};
