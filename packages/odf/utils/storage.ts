import { K8sResourceKind } from '@odf/shared/types';
import { convertToBaseValue } from '@odf/shared/utils/humanize';

export const calcPVsCapacity = (pvs: K8sResourceKind[]): number =>
  pvs.reduce((sum, pv) => {
    const storage = Number(convertToBaseValue(pv.spec.capacity.storage));
    return sum + storage;
}, 0);
