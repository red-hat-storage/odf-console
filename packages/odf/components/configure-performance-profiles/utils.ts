import { isOcsLabeledWizardNode } from '@odf/core/components/create-storage-system/payloads';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { StorageClusterKind } from '@odf/shared';
import { ConfigurePerformanceProfileFormState } from './state';

export const getOcsLabeledWizardNodes = (
  nodes: WizardNodeState[],
  namespace: string
): WizardNodeState[] =>
  nodes.filter((node) => isOcsLabeledWizardNode(node, namespace));

export type ShouldShowConfigurePerformanceProfileParams = {
  storageCluster?: StorageClusterKind;
  isExternalMode: boolean;
  isNoobaaAvailable: boolean;
};

export const shouldShowCoreStorageSection = ({
  storageCluster,
  isExternalMode,
}: ShouldShowConfigurePerformanceProfileParams): boolean =>
  !!storageCluster && !isExternalMode;

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

export const checkRequiredValues = (
  state: ConfigurePerformanceProfileFormState,
  showCoreStorage: boolean,
  showMcgPerformance: boolean
): boolean => {
  const isCoreDisabled = showCoreStorage ? !state.resourceProfile : true;
  const isMcgDisabled = showMcgPerformance
    ? true // ToDo: Add !state.performanceProfile
    : true;

  if (showCoreStorage && showMcgPerformance) {
    return isCoreDisabled && isMcgDisabled;
  }
  if (showCoreStorage) {
    return isCoreDisabled;
  }
  return isMcgDisabled;
};
