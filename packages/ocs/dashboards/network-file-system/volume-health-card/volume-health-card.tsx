import * as React from 'react';
import { VolumeHealthCard as VolumeHealthCardContent } from '@odf/ocs/dashboards/common/volume-health-card/volume-health-card';
import { filterCephNFSSCByCluster } from '@odf/ocs/utils/common';
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
  const nfsSCs = filterCephNFSSCByCluster(scs, ns).map(getName) || [];
  const nfsPVCs = filterPVCsByStorageClass(nfsSCs, pvcs) || [];
  const nfsPVCsSet = new Set(nfsPVCs.map(getName));

  return (pvc: PersistentVolumeClaimKind) => nfsPVCsSet.has(getName(pvc));
};

const VolumeHealthCard: React.FC = () => {
  return <VolumeHealthCardContent pvcFilter={pvcFilter} />;
};

export default VolumeHealthCard;
