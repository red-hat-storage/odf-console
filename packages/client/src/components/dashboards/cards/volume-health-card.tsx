import * as React from 'react';
import { VolumeHealthCard as VolumeHealthCardContent } from '@odf/ocs/dashboards/common/volume-health-card/volume-health-card';
import { getCephSC } from '@odf/ocs/utils/common';
import { getName } from '@odf/shared/selectors';
import {
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import { filterPVCsByStorageClass } from '@odf/shared/utils';

const pvcFilter = (
  scs: StorageClassResourceKind[],
  pvcs: PersistentVolumeClaimKind[],
  _ns: string
) => {
  const cephSCs = getCephSC(scs).map(getName) || [];
  const cephPVCs = filterPVCsByStorageClass(cephSCs, pvcs) || [];
  const cephPVCsSet = new Set(cephPVCs.map(getName));

  return (pvc: PersistentVolumeClaimKind) => cephPVCsSet.has(getName(pvc));
};

export const VolumeHealthCard: React.FC = () => {
  return <VolumeHealthCardContent pvcFilter={pvcFilter} />;
};
