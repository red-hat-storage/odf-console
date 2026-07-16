import * as React from 'react';
import {
  GlobalnetCheckStatus,
  GlobalnetRequirement,
  PRE_PAIR_NETWORK_WATCH_DEBOUNCE_MS,
  SUBMARINER_ADDON_NAME,
  SUBMARINER_CLUSTER_GVK,
  SUBMARINER_CLUSTER_NAMESPACE,
  SubmarinerClusterHealth,
} from '@odf/mco/constants';
import {
  ACMManagedClusterKind,
  SubmarinerAddOnKind,
  SubmarinerBrokerKind,
  SubmarinerClusterKind,
} from '@odf/mco/types';
import { fireManagedClusterView } from '@odf/mco/utils/managed-cluster-view';
import {
  evaluateGlobalnetPrePair,
  evaluateSubmarinerPrePair,
} from '@odf/mco/utils/submariner-health';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isAbortError,
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
  submarinerOverallHealth: SubmarinerClusterHealth;
  globalnetStatus: GlobalnetCheckStatus;
  globalnetRequirement: GlobalnetRequirement;
  clusterStatuses: ReturnType<
    typeof evaluateSubmarinerPrePair
  >['clusterStatuses'];
};

const idleState: PrePairNetworkValidationState = {
  loaded: true,
  loadError: null,
  canProceed: true,
  submarinerOverallHealth: SubmarinerClusterHealth.NotInstalled,
  globalnetStatus: GlobalnetCheckStatus.Skipped,
  globalnetRequirement: GlobalnetRequirement.Skipped,
  clusterStatuses: [],
};

const checkingState: PrePairNetworkValidationState = {
  loaded: false,
  loadError: null,
  canProceed: false,
  submarinerOverallHealth: SubmarinerClusterHealth.Checking,
  globalnetStatus: GlobalnetCheckStatus.Checking,
  globalnetRequirement: GlobalnetRequirement.Checking,
  clusterStatuses: [],
};

const identityT = ((key: string) => key) as TFunction;

const isAddonAbsent = (
  loaded: boolean,
  addon: SubmarinerAddOnKind | undefined,
  loadError: unknown
): boolean => loaded && !addon && (!loadError || isNotFoundError(loadError));

const useUpstreamSubmarinerDetection = (
  clusterName: string | undefined,
  enabled: boolean
): boolean => {
  const [detected, setDetected] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !clusterName) {
      setDetected(false);
      return;
    }

    let cancelled = false;
    setDetected(false);

    fireManagedClusterView(
      clusterName,
      SUBMARINER_CLUSTER_NAMESPACE,
      SUBMARINER_CLUSTER_GVK.kind,
      SUBMARINER_CLUSTER_GVK.version,
      SUBMARINER_CLUSTER_GVK.group,
      clusterName,
      identityT
    )
      .then((response) => {
        if (!cancelled) {
          setDetected(!!response.result);
        }
      })
      .catch((error) => {
        if (!cancelled && !isAbortError(error)) {
          setDetected(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clusterName, enabled]);

  return detected;
};

export const usePrePairNetworkValidation = (
  clusterNames: string[],
  enabled: boolean
): PrePairNetworkValidationState => {
  const clusterA = clusterNames[0];
  const clusterB = clusterNames[1];
  const selectionReady = enabled && clusterNames.length === 2;

  const [debouncedReady, setDebouncedReady] = React.useState(false);

  React.useEffect(() => {
    if (!selectionReady) {
      setDebouncedReady(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setDebouncedReady(true);
    }, PRE_PAIR_NETWORK_WATCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [selectionReady, clusterA, clusterB]);

  const shouldWatch = selectionReady && debouncedReady;

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

  const watchAcmGlobalnet =
    shouldWatch && ((loadedA && !!addonA) || (loadedB && !!addonB));

  const [brokers, brokersLoaded, brokersError] = useK8sWatchResource<
    SubmarinerBrokerKind[]
  >(
    getValidWatchK8sResourceObj(
      getSubmarinerBrokerListResourceObj(),
      watchAcmGlobalnet
    )
  );
  const [managedClusterA, managedClusterALoaded, managedClusterAError] =
    useK8sWatchResource<ACMManagedClusterKind>(
      getValidWatchK8sResourceObj(
        getManagedClusterResourceObj({ name: clusterA }),
        watchAcmGlobalnet && !!clusterA
      )
    );
  const [managedClusterB, managedClusterBLoaded, managedClusterBError] =
    useK8sWatchResource<ACMManagedClusterKind>(
      getValidWatchK8sResourceObj(
        getManagedClusterResourceObj({ name: clusterB }),
        watchAcmGlobalnet && !!clusterB
      )
    );
  const [
    submarinerClusters,
    submarinerClustersLoaded,
    submarinerClustersError,
  ] = useK8sWatchResource<SubmarinerClusterKind[]>(
    getValidWatchK8sResourceObj(
      getSubmarinerClusterListResourceObj(),
      watchAcmGlobalnet
    )
  );

  const shouldDetectUpstreamA =
    shouldWatch && !!clusterA && isAddonAbsent(loadedA, addonA, errorA);
  const shouldDetectUpstreamB =
    shouldWatch && !!clusterB && isAddonAbsent(loadedB, addonB, errorB);
  const upstreamDetectedA = useUpstreamSubmarinerDetection(
    clusterA,
    shouldDetectUpstreamA
  );
  const upstreamDetectedB = useUpstreamSubmarinerDetection(
    clusterB,
    shouldDetectUpstreamB
  );

  if (!selectionReady) {
    return idleState;
  }

  if (!debouncedReady) {
    return checkingState;
  }

  const submarinerResult = evaluateSubmarinerPrePair([
    {
      clusterName: clusterA,
      addon: addonA,
      loaded: loadedA,
      loadError: errorA,
      upstreamDetected: upstreamDetectedA,
    },
    {
      clusterName: clusterB,
      addon: addonB,
      loaded: loadedB,
      loadError: errorB,
      upstreamDetected: upstreamDetectedB,
    },
  ]);

  const skipGlobalnetCheck =
    submarinerResult.overallHealth === SubmarinerClusterHealth.NotInstalled ||
    submarinerResult.overallHealth === SubmarinerClusterHealth.UpstreamDetected;

  const globalnet = evaluateGlobalnetPrePair(
    brokers,
    watchAcmGlobalnet ? brokersLoaded : true,
    watchAcmGlobalnet ? brokersError : null,
    [
      {
        clusterName: clusterA,
        clusterClaims: managedClusterA?.status?.clusterClaims,
        loaded: watchAcmGlobalnet ? managedClusterALoaded : true,
        loadError: watchAcmGlobalnet ? managedClusterAError : null,
      },
      {
        clusterName: clusterB,
        clusterClaims: managedClusterB?.status?.clusterClaims,
        loaded: watchAcmGlobalnet ? managedClusterBLoaded : true,
        loadError: watchAcmGlobalnet ? managedClusterBError : null,
      },
    ],
    submarinerClusters,
    watchAcmGlobalnet ? submarinerClustersLoaded : true,
    skipGlobalnetCheck
  );

  const loaded =
    loadedA &&
    loadedB &&
    (!watchAcmGlobalnet ||
      (brokersLoaded &&
        managedClusterALoaded &&
        managedClusterBLoaded &&
        submarinerClustersLoaded));

  const loadError = [
    errorA,
    errorB,
    ...(watchAcmGlobalnet
      ? [
          brokersError,
          managedClusterAError,
          managedClusterBError,
          submarinerClustersError,
        ]
      : []),
  ].find((error) => error && !isNotFoundError(error));

  return {
    loaded,
    loadError,
    canProceed: !loadError && submarinerResult.canProceed,
    submarinerOverallHealth: submarinerResult.overallHealth,
    globalnetStatus: globalnet.status,
    globalnetRequirement: globalnet.requirement,
    clusterStatuses: submarinerResult.clusterStatuses,
  };
};
