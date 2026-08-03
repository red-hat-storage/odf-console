import { ARCHITECTURE_S390X } from '@odf/core/constants';
import { McgPerformanceProfile } from '@odf/core/types';
import { TFunction } from 'i18next';

type McgProfileRequirements = {
  cpu: number;
  memoryGiB: number;
};

const MCG_PROFILE_REQUIREMENTS: Record<
  McgPerformanceProfile,
  McgProfileRequirements
> = {
  [McgPerformanceProfile.Default]: { cpu: 4.4, memoryGiB: 8.83 },
  [McgPerformanceProfile.MixedWorkload]: { cpu: 16.2, memoryGiB: 28.49 },
  [McgPerformanceProfile.SmallObjects]: { cpu: 18.2, memoryGiB: 44.49 },
};

const MCG_PROFILE_REQUIREMENTS_S390X: Record<
  McgPerformanceProfile,
  McgProfileRequirements
> = {
  [McgPerformanceProfile.Default]: { cpu: 2.2, memoryGiB: 8.83 },
  [McgPerformanceProfile.MixedWorkload]: { cpu: 8.1, memoryGiB: 28.49 },
  [McgPerformanceProfile.SmallObjects]: { cpu: 9.1, memoryGiB: 44.49 },
};

export const getMcgProfileRequirements = (
  profile: McgPerformanceProfile,
  architecture?: string
): { minCpu: number; minMem: number } => {
  const requirements =
    architecture === ARCHITECTURE_S390X
      ? MCG_PROFILE_REQUIREMENTS_S390X[profile]
      : MCG_PROFILE_REQUIREMENTS[profile];
  return {
    minCpu: Math.ceil(requirements.cpu),
    minMem: Math.ceil(requirements.memoryGiB),
  };
};

export const isMcgProfileAllowed = (
  profile: McgPerformanceProfile,
  clusterCpu: number,
  clusterMemoryGiB: number,
  architecture?: string
): boolean => {
  const { minCpu, minMem } = getMcgProfileRequirements(profile, architecture);
  return clusterCpu >= minCpu && clusterMemoryGiB >= minMem;
};

export const getMcgProfileDisplayName = (
  profile: McgPerformanceProfile,
  t: TFunction
): string => {
  switch (profile) {
    case McgPerformanceProfile.Default:
      return t('Default');
    case McgPerformanceProfile.MixedWorkload:
      return t('Mixed workload');
    case McgPerformanceProfile.SmallObjects:
      return t('Small objects');
  }
};
