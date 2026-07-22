import * as React from 'react';
import { VolumeHealthCard as VolumeHealthCardContent } from '@odf/ocs/dashboards/common/volume-health-card/volume-health-card';
import { filterCephSCByCluster } from '@odf/ocs/utils/common';
import { getName } from '@odf/shared/selectors';
import {
  PersistentVolumeClaimKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import { filterPVCsByStorageClass } from '@odf/shared/utils';

const pvcFilter = (
  scs: StorageClassResourceKind[],
  pvcs: PersistentVolumeClaimKind[],
  ns: string
) => {
  const cephSCs = filterCephSCByCluster(scs, ns).map(getName) || [];
  const cephPVCs = filterPVCsByStorageClass(cephSCs, pvcs) || [];
  const cephPVCsSet = new Set(cephPVCs.map(getName));

  return (pvc: PersistentVolumeClaimKind) => cephPVCsSet.has(getName(pvc));
};

const VolumeHealthCard: React.FC = () => {
  return <VolumeHealthCardContent pvcFilter={pvcFilter} />;
};

export default VolumeHealthCard;
