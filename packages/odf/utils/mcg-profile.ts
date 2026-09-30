import {
  ARCHITECTURE_S390X,
  NOOBAA_TYPE_MAP,
  StoreProviders,
} from '@odf/core/constants';
import { BackingStoreKind, McgPerformanceProfile } from '@odf/core/types';
import { TFunction } from 'i18next';

type McgProfileRequirements = {
  cpu: number;
  memoryGiB: number;
};

const MCG_PROFILE_REQUIREMENTS: Record<
  McgPerformanceProfile,
  McgProfileRequirements
> = {
  [McgPerformanceProfile.Default]: { cpu: 3.9, memoryGiB: 7.98 },
  [McgPerformanceProfile.MixedWorkload]: { cpu: 14.4, memoryGiB: 24.98 },
  [McgPerformanceProfile.SmallObjects]: { cpu: 16.4, memoryGiB: 40.98 },
};

const MCG_PROFILE_REQUIREMENTS_WITH_PV_POOL: Record<
  McgPerformanceProfile,
  McgProfileRequirements
> = {
  [McgPerformanceProfile.Default]: { cpu: 5.1, memoryGiB: 10.32 },
  [McgPerformanceProfile.MixedWorkload]: { cpu: 17.4, memoryGiB: 30.98 },
  [McgPerformanceProfile.SmallObjects]: { cpu: 19.4, memoryGiB: 46.98 },
};

const IBM_Z_CPU_ADJUST_FACTOR = 0.2;

export const isDefaultBackingStorePvPool = (
  backingStore?: BackingStoreKind
): boolean => backingStore?.spec?.type === NOOBAA_TYPE_MAP[StoreProviders.PVC];

export const getMcgProfileRequirements = (
  profile: McgPerformanceProfile,
  architecture?: string,
  includePvPool: boolean = false
): { minCpu: number; minMem: number } => {
  const requirements = includePvPool
    ? MCG_PROFILE_REQUIREMENTS_WITH_PV_POOL[profile]
    : MCG_PROFILE_REQUIREMENTS[profile];

  let cpu = requirements.cpu;
  if (architecture === ARCHITECTURE_S390X) {
    cpu *= IBM_Z_CPU_ADJUST_FACTOR;
  }

  return {
    minCpu: Math.ceil(cpu),
    minMem: Math.ceil(requirements.memoryGiB),
  };
};

export const isMcgProfileAllowed = (
  profile: McgPerformanceProfile,
  clusterCpu: number,
  clusterMemoryGiB: number,
  architecture?: string,
  includePvPool: boolean = false
): boolean => {
  const { minCpu, minMem } = getMcgProfileRequirements(
    profile,
    architecture,
    includePvPool
  );
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
