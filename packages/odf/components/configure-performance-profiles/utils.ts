import { isOcsLabeledWizardNode } from '@odf/core/components/create-storage-system/payloads';
import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { StorageClusterKind, StorageClusterResource } from '@odf/shared';
import { ConfigurePerformanceProfileFormState } from './state';

export const MCG_CUSTOM_RESOURCE_KEYS = [
  'noobaa-core',
  'noobaa-db',
  'noobaa-endpoint',
] as const;

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

export const hasMcgCustomResources = (
  resources?: StorageClusterResource
): boolean =>
  !!resources &&
  MCG_CUSTOM_RESOURCE_KEYS.some((key) => resources[key] !== undefined);

export const clearMcgCustomResources = (
  resources?: StorageClusterResource
): StorageClusterResource | undefined => {
  if (!resources || !hasMcgCustomResources(resources)) {
    return resources;
  }
  const cleaned = { ...resources };
  MCG_CUSTOM_RESOURCE_KEYS.forEach((key) => {
    delete cleaned[key];
  });
  return cleaned;
};

export const checkRequiredValues = (
  state: ConfigurePerformanceProfileFormState,
  showCoreStorage: boolean,
  showMcgPerformance: boolean
): boolean => {
  const isCoreDisabled = showCoreStorage && !state.resourceProfile;
  const isMcgDisabled = showMcgPerformance && !state.mcgPerformanceProfile;

  if (showCoreStorage && showMcgPerformance) {
    return isCoreDisabled && isMcgDisabled;
  }
  if (showCoreStorage) {
    return isCoreDisabled;
  }
  return isMcgDisabled;
};
