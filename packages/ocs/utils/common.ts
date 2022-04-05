import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import * as _ from 'lodash';
import { CEPH_STORAGE_NAMESPACE } from 'packages/odf/constants';
import { CephObjectStoreModel, NooBaaBackingStoreModel, NooBaaBucketClassModel, NooBaaObjectBucketClaimModel } from 'packages/odf/models';
import { PersistentVolumeClaimModel, PersistentVolumeModel } from 'packages/shared/models';
import { getNamespace } from 'packages/shared/selectors';

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
  if (eventKind !== PersistentVolumeClaimModel.kind && eventKind !== PersistentVolumeModel.kind) {
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
      : eventNamespace === CEPH_STORAGE_NAMESPACE;
  };
