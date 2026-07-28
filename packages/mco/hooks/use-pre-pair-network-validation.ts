import {
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_ADDON_NAME,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import {
  evaluateSubmarinerPrePair,
  SubmarinerPrePairResult,
} from '@odf/mco/utils/submariner-health';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isNotFoundError,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { getSubmarinerAddonListResourceObj } from './mco-resources';

export type PrePairNetworkValidationState = SubmarinerPrePairResult & {
  loaded: boolean;
  loadError: unknown;
};

const idleState: PrePairNetworkValidationState = {
  loaded: true,
  loadError: null,
  canProceed: true,
  status: SubmarinerStatus.NotInstalled,
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

  if (!shouldWatch) {
    return idleState;
  }

  const { canProceed, status } = evaluateSubmarinerPrePair([
    { addon: addonA, loaded: addonsLoaded, loadError: addonsError },
    { addon: addonB, loaded: addonsLoaded, loadError: addonsError },
  ]);

  const loadError =
    addonsError && !isNotFoundError(addonsError) ? addonsError : undefined;

  // Non-404 load errors already map to Degraded / canProceed false in evaluate.
  return {
    loaded: addonsLoaded,
    loadError,
    canProceed,
    status,
  };
};
