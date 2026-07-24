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

  if (!shouldWatch) {
    return idleState;
  }

  const { canProceed, status } = evaluateSubmarinerPrePair([
    { addon: addonA, loaded: loadedA, loadError: errorA },
    { addon: addonB, loaded: loadedB, loadError: errorB },
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
    status === SubmarinerStatus.NotInstalled
  );

  const loaded =
    loadedA &&
    loadedB &&
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
