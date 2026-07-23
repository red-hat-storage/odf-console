import {
  MAX_ALLOWED_CLUSTERS,
  SUBMARINER_ADDON_NAME,
  SubmarinerStatus,
} from '@odf/mco/constants';
import { SubmarinerAddOnKind } from '@odf/mco/types';
import { evaluateSubmarinerPrePair } from '@odf/mco/utils/submariner-health';
import { getName } from '@odf/shared/selectors';
import {
  getValidWatchK8sResourceObj,
  isNotFoundError,
} from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { getSubmarinerAddonListResourceObj } from './mco-resources';

export type PrePairNetworkValidationState = {
  loaded: boolean;
  loadError: unknown;
  canProceed: boolean;
  status: SubmarinerStatus;
};

const idleState: PrePairNetworkValidationState = {
  loaded: true,
  loadError: null,
  canProceed: true,
  status: SubmarinerStatus.NotInstalled,
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

  if (!shouldWatch) {
    return idleState;
  }

  const { canProceed, status } = evaluateSubmarinerPrePair([
    { addon: addonA, loaded: loadedA, loadError: errorA },
    { addon: addonB, loaded: loadedB, loadError: errorB },
  ]);

  const loadError = [errorA, errorB].find(
    (error) => error && !isNotFoundError(error)
  );

  return {
    loaded: loadedA && loadedB,
    loadError,
    canProceed: !loadError && canProceed,
    status,
  };
};
