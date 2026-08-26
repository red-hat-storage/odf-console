import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { isExternalCluster } from '@odf/core/utils';
import { StorageClusterKind } from '@odf/shared';
import { isOcsLabeledNode } from '@odf/shared/utils';
import { ConfigurePerformanceProfileFormState } from './state';

export const getOcsLabeledWizardNodes = (
  nodes: WizardNodeState[]
): WizardNodeState[] => nodes.filter((node) => isOcsLabeledNode(node));

export type ShouldShowConfigurePerformanceProfileParams = {
  storageCluster?: StorageClusterKind;
  isNoobaaAvailable: boolean;
};

export const shouldShowCoreStorageSection = ({
  storageCluster,
}: Pick<
  ShouldShowConfigurePerformanceProfileParams,
  'storageCluster'
>): boolean => !!storageCluster && !isExternalCluster(storageCluster);

export const shouldShowMcgPerformanceSection = ({
  isNoobaaAvailable,
}: Pick<
  ShouldShowConfigurePerformanceProfileParams,
  'isNoobaaAvailable'
>): boolean => isNoobaaAvailable;

export const shouldShowConfigurePerformanceProfile = (
  params: ShouldShowConfigurePerformanceProfileParams
): boolean =>
  shouldShowCoreStorageSection(params) ||
  shouldShowMcgPerformanceSection(params);

/** Returns true when Save should stay disabled. */
export const checkRequiredValues = (
  state: ConfigurePerformanceProfileFormState,
  showCoreStorage: boolean,
  showMcgPerformance: boolean
): boolean => {
  const isCoreDisabled = showCoreStorage
    ? !state.resourceProfile ||
      state.resourceProfile === state.initialResourceProfile
    : true;
  const isMcgDisabled = showMcgPerformance
    ? true // ToDo: Add !state.performanceProfile || state.performanceProfile === state.initialPerformanceProfile
    : true;

  if (showCoreStorage && showMcgPerformance) {
    return isCoreDisabled && isMcgDisabled;
  }
  if (showCoreStorage) {
    return isCoreDisabled;
  }
  return isMcgDisabled;
};
