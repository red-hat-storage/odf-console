import { WizardNodeState } from '@odf/core/components/create-storage-system/reducer';
import { isExternalCluster } from '@odf/core/utils';
import { StorageClusterKind, StorageClusterResource } from '@odf/shared';
import { isOcsLabeledNode } from '@odf/shared/utils';
import { ConfigurePerformanceProfileFormState } from './state';

export const MCG_CUSTOM_RESOURCE_KEYS = [
  'noobaa-core',
  'noobaa-db',
  'noobaa-endpoint',
];

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

export const hasMcgCustomResources = (
  resources?: StorageClusterResource
): boolean =>
  !!resources &&
  MCG_CUSTOM_RESOURCE_KEYS.some((key) => resources[key] !== undefined);

/*
  Removes noobaa-core, noobaa-db, and noobaa-endpoint from spec.resources when a
  performance profile is saved. Other resources are preserved. Custom resources
  are left unchanged when no profile is saved, or when set after a profile.
 */
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

export const isSaveDisabled = (
  state: ConfigurePerformanceProfileFormState,
  showCoreStorage: boolean,
  showMcgPerformance: boolean
): boolean => {
  const isCoreDisabled = showCoreStorage
    ? !state.resourceProfile ||
      state.resourceProfile === state.initialResourceProfile
    : true;
  const isMcgDisabled = showMcgPerformance
    ? !state.mcgPerformanceProfile ||
      state.mcgPerformanceProfile === state.initialMcgPerformanceProfile
    : true;

  if (showCoreStorage && showMcgPerformance) {
    return isCoreDisabled && isMcgDisabled;
  }
  if (showCoreStorage) {
    return isCoreDisabled;
  }
  return isMcgDisabled;
};
