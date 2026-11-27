import { PrePairCheckId } from '@odf/mco/constants';
import type { StorageVendorDescriptor } from '@odf/mco/utils/storage-vendor-registry';
import { odfPrerequisitesCheck } from './odf-prerequisites';
import { storageClassCompatibilityCheck } from './storage-class-compatibility';
import { submarinerCheck } from './submariner';
import type { PrePairCheck } from './types';

const PRE_PAIR_CHECKS: Record<PrePairCheckId, PrePairCheck> = {
  [PrePairCheckId.OdfPrerequisites]: odfPrerequisitesCheck,
  [PrePairCheckId.StorageClassCompatibility]: storageClassCompatibilityCheck,
  submariner: submarinerCheck,
};

const NO_CHECKS: PrePairCheck[] = [];

export const getPrePairChecks = (
  descriptor: StorageVendorDescriptor | null | undefined
): PrePairCheck[] =>
  descriptor?.prePairChecks.length
    ? descriptor.prePairChecks.map((id) => PRE_PAIR_CHECKS[id])
    : NO_CHECKS;
