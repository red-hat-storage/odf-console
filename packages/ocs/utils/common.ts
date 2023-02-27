import {
  CephObjectStoreModel,
  NooBaaBackingStoreModel,
  NooBaaBucketClassModel,
  NooBaaObjectBucketClaimModel,
} from '@odf/core/models';
import {
  PersistentVolumeClaimModel,
  PersistentVolumeModel,
} from '@odf/shared/models';
import { getNamespace } from '@odf/shared/selectors';
import {
  HumanizeResult,
  K8sResourceKind,
  StorageClassResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { DataPoint, humanizePercentage } from '@odf/shared/utils';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import * as _ from 'lodash-es';
import { cephStorageLabel, CEPH_NS } from '../constants';

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

export const isObjectStorageEvent = (event: EventKind): boolean => {
  const eventKind: string = event?.involvedObject?.kind;
  const objectStorageResources = [
    NooBaaBackingStoreModel.kind,
    NooBaaBucketClassModel.kind,
    NooBaaObjectBucketClaimModel.kind,
    CephObjectStoreModel.kind,
  ];
  if (
    eventKind !== PersistentVolumeClaimModel.kind &&
    eventKind !== PersistentVolumeModel.kind
  ) {
    const eventName: string = event?.involvedObject?.name;
    return _.startsWith(eventName, 'noobaa') || eventName?.includes('rgw');
  }
  return objectStorageResources.includes(eventKind);
};

export const isPersistentStorageEvent =
  (pvcs: string[]) =>
  (event: EventKind): boolean => {
    if (isObjectStorageEvent(event)) return false;
    const eventKind = event?.involvedObject?.kind;
    const eventNamespace = getNamespace(event);
    const eventObjectName = event?.involvedObject?.name;
    return eventKind === PersistentVolumeClaimModel.kind
      ? pvcs.includes(eventObjectName)
      : eventNamespace === CEPH_NS;
  };

export const getOperatorVersion = (operator: K8sResourceKind): string =>
  operator?.spec?.version;

export const getCephSC = (
  scData: StorageClassResourceKind[]
): K8sResourceKind[] =>
  scData.filter((sc) => {
    return cephStorageProvisioners.some((provisioner: string) =>
      (sc?.provisioner).includes(provisioner)
    );
  });

export const getCephNodes = (
  nodesData: K8sResourceKind[] = []
): K8sResourceKind[] =>
  nodesData.filter((node) =>
    Object.keys(node?.metadata?.labels).includes(cephStorageLabel)
  );

export const getCephPVs = (
  pvsData: K8sResourceKind[] = []
): K8sResourceKind[] =>
  pvsData.filter((pv) => {
    return cephStorageProvisioners.some((provisioner: string) =>
      (
        pv?.metadata?.annotations?.['pv.kubernetes.io/provisioned-by'] ?? ''
      ).includes(provisioner)
    );
  });

const enum Status {
  BOUND = 'Bound',
  AVAILABLE = 'Available',
}
const isBound = (pvc: K8sResourceKind) => pvc.status.phase === Status.BOUND;
const getPVStorageClass = (pv: K8sResourceKind) => pv?.spec?.storageClassName;

export const getStorageClassName = (pvc: K8sResourceKind) =>
  pvc?.spec?.storageClassName ||
  pvc?.metadata?.annotations?.['volume.beta.kubernetes.io/storage-class'];

export const getCephPVCs = (
  cephSCNames: string[] = [],
  pvcsData: K8sResourceKind[] = [],
  pvsData: K8sResourceKind[] = []
): K8sResourceKind[] => {
  const cephPVs = getCephPVs(pvsData);
  const cephSCNameSet = new Set<string>([
    ...cephSCNames,
    ...cephPVs.map(getPVStorageClass),
  ]);
  const cephBoundPVCUIDSet = new Set<string>(
    _.map(cephPVs, 'spec.claimRef.uid')
  );
  // If the PVC is bound use claim uid(links PVC to PV) else storage class to verify it's provisioned by ceph.
  return pvcsData.filter((pvc: K8sResourceKind) =>
    isBound(pvc)
      ? cephBoundPVCUIDSet.has(pvc.metadata.uid)
      : cephSCNameSet.has(getStorageClassName(pvc))
  );
};

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
