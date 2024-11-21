import { cephStorageLabel } from '@odf/core/constants';
import {
  CephObjectStoreModel,
  NooBaaBackingStoreModel,
  NooBaaBucketClassModel,
  NooBaaObjectBucketClaimModel,
} from '@odf/core/models';
import { PVCStatus } from '@odf/shared/constants';
import {
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
} from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  NodeKind,
  HumanizeResult,
  K8sResourceKind,
  StorageClassResourceKind,
  StorageClusterKind,
  PersistentVolumeClaimKind,
} from '@odf/shared/types';
import { DataPoint, humanizePercentage } from '@odf/shared/utils';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import * as _ from 'lodash-es';
import { compose } from 'redux';
import { OCS_STORAGECLASS_PARAMS } from '../constants';

const getPVStorageClass = (pv: K8sResourceKind): string =>
  pv?.spec?.storageClassName;

const isBound = (pvc: PersistentVolumeClaimKind): boolean =>
  pvc?.status?.phase === PVCStatus.BOUND;

export const cephStorageProvisioners = [
  'ceph.rook.io/block',
  'cephfs.csi.ceph.com',
  'rbd.csi.ceph.com',
];

export const isCephProvisioner = (scProvisioner: string): boolean => {
  return cephStorageProvisioners.some((provisioner: string) =>
    _.endsWith(scProvisioner, provisioner)
  );
};

export const isObjectStorageEvent =
  (isRGW: boolean, isMCG: boolean) =>
  (event: EventKind): boolean => {
    const eventKind: string = event?.involvedObject?.kind;
    const objectStorageResources = [
      ...(isMCG
        ? [
            NooBaaBackingStoreModel.kind,
            NooBaaBucketClassModel.kind,
            NooBaaObjectBucketClaimModel.kind,
          ]
        : []),
      ...(isRGW ? [CephObjectStoreModel.kind] : []),
    ];
    if (
      ![PersistentVolumeClaimModel.kind, PersistentVolumeModel.kind].includes(
        eventKind
      )
    ) {
      const eventName: string = event?.involvedObject?.name;

      if (isRGW && isMCG)
        return _.startsWith(eventName, 'noobaa') || eventName?.includes('rgw');
      if (isRGW) return eventName?.includes('rgw');
      if (isMCG) return _.startsWith(eventName, 'noobaa');
    }

    return objectStorageResources.includes(eventKind);
  };

export const isPersistentStorageEvent =
  (pvcs: string[], ns: string) =>
  (event: EventKind): boolean => {
    if (isObjectStorageEvent(true, true)(event)) return false;
    const eventKind = event?.involvedObject?.kind;
    const eventNamespace = getNamespace(event);
    const eventObjectName = event?.involvedObject?.name;
    return eventKind === PersistentVolumeClaimModel.kind
      ? pvcs.includes(eventObjectName)
      : eventNamespace === ns;
  };

// All Ceph based StorageClasses (across multiple Ceph clusters)
export const getCephSC = (
  scData: StorageClassResourceKind[] = []
): StorageClassResourceKind[] =>
  scData.filter((sc) => {
    return cephStorageProvisioners.some((provisioner: string) =>
      (sc?.provisioner).includes(provisioner)
    );
  });

// All Ceph based StorageClasses from a particular Ceph cluster (multiple StorageSystem/StorageCluster scenario)
export const filterCephSCByCluster: (
  scData: StorageClassResourceKind[],
  clusterNs: string
) => StorageClassResourceKind[] = compose(
  getCephSC,
  (scData: StorageClassResourceKind[] = [], clusterNs: string) =>
    scData.filter((sc) =>
      OCS_STORAGECLASS_PARAMS.some(
        (param: string) => sc.parameters?.[param] === clusterNs
      )
    )
);

export const getCephNodes = (
  nodesData: NodeKind[] = [],
  ns: string
): NodeKind[] => {
  const storageLabel = cephStorageLabel(ns);
  return nodesData.filter((node) =>
    Object.keys(node?.metadata?.labels).includes(storageLabel)
  );
};

// All Ceph based PVs (across multiple Ceph clusters)
export const getCephPVs = (
  pvsData: K8sResourceKind[] = []
): K8sResourceKind[] =>
  pvsData.filter((pv) => {
    return cephStorageProvisioners.some((provisioner: string) =>
      (
        pv?.metadata?.annotations?.['pv.kubernetes.io/provisioned-by'] ||
        pv?.spec?.csi?.driver ||
        ''
      ).includes(provisioner)
    );
  });

// All Ceph based PVs from a particular Ceph cluster (multiple StorageSystem/StorageCluster scenario)
export const filterCephPVsByCluster: (
  pvsData: K8sResourceKind[],
  scData: StorageClassResourceKind[],
  clusterNs: string
) => K8sResourceKind[] = compose(
  getCephPVs,
  (
    pvsData: K8sResourceKind[] = [],
    scData: StorageClassResourceKind[] = [],
    clusterNs: string
  ) => {
    const filteredCephSCNames = new Set(
      filterCephSCByCluster(scData, clusterNs)?.map(getName)
    );
    return pvsData.filter((pv) =>
      filteredCephSCNames.has(getPVStorageClass(pv))
    );
  }
);

export const getStorageClassName = (pvc: PersistentVolumeClaimKind): string =>
  pvc?.spec?.storageClassName ||
  pvc?.metadata?.annotations?.['volume.beta.kubernetes.io/storage-class'];

// All Ceph based PVCs (across multiple Ceph clusters)
export const getCephPVCs = (
  cephSCNames: string[] = [],
  pvcsData: PersistentVolumeClaimKind[] = [],
  pvsData: K8sResourceKind[] = []
): PersistentVolumeClaimKind[] => {
  const cephPVs = getCephPVs(pvsData);
  const cephSCNameSet = new Set<string>([
    ...cephSCNames,
    ...cephPVs.map(getPVStorageClass),
  ]);
  const cephBoundPVCUIDSet = new Set<string>(
    _.map(cephPVs, 'spec.claimRef.uid')
  );
  // If the PVC is bound use claim uid (links PVC to PV) else storage class to verify it's provisioned by ceph.
  return pvcsData.filter((pvc: PersistentVolumeClaimKind) =>
    isBound(pvc)
      ? cephBoundPVCUIDSet.has(pvc.metadata.uid)
      : cephSCNameSet.has(getStorageClassName(pvc))
  );
};

// All Ceph based PVCs from a particular Ceph cluster (multiple StorageSystem/StorageCluster scenario)
export const filterCephPVCsByCluster = (
  scData: StorageClassResourceKind[] = [],
  pvcsData: PersistentVolumeClaimKind[] = [],
  pvsData: K8sResourceKind[] = [],
  clusterNs: string
): PersistentVolumeClaimKind[] =>
  getCephPVCs(
    filterCephSCByCluster(scData, clusterNs)?.map(getName),
    pvcsData,
    filterCephPVsByCluster(pvsData, scData, clusterNs)
  );

export const decodeRGWPrefix = (secretData: K8sResourceKind) => {
  try {
    return JSON.parse(atob(secretData?.data?.external_cluster_details)).find(
      (item) => item?.name === 'ceph-rgw'
    )?.data?.poolPrefix;
  } catch {
    return '';
  }
};

export const convertNaNToNull = (value: DataPoint) =>
  _.isNaN(value?.y) ? Object.assign(value, { y: null }) : value;

export const getLatestValue = (stats: DataPoint[] = []) =>
  Number(stats?.[stats?.length - 1]?.y);

export const calcPercentage = (value: number, total: number): HumanizeResult =>
  humanizePercentage((value * 100) / total);

export const getNetworkEncryption = (cluster: StorageClusterKind) =>
  cluster?.spec?.network?.connections?.encryption?.enabled || false;
