import { StorageConsumerKind, StorageConsumerState } from '@odf/shared';
import { generatePatchToModifyStorageClasses } from './utils';

const storageConsumer: StorageConsumerKind = {
  apiVersion: 'ocs.openshift.io/v1alpha1',
  kind: 'StorageConsumer',
  metadata: {
    name: 'internal',
    namespace: 'openshift-storage',
  },
  spec: {
    enable: true,
    storageQuotaInGiB: 1000,
    storageClasses: [
      {
        name: 'ocs-storagecluster-ceph-rbd',
      },
      {
        name: 'ocs-storagecluster-cephfs',
      },
    ],
    volumeGroupSnapshotClasses: [
      {
        name: 'ocs-storagecluster-cephfs-groupsnapclass',
      },
      {
        name: 'ocs-storagecluster-ceph-rbd-groupsnapclass',
      },
    ],
    volumeSnapshotClasses: [
      {
        name: 'ocs-storagecluster-rbdplugin-snapclass',
      },
      {
        name: 'ocs-storagecluster-cephfsplugin-snapclass',
      },
    ],
  },
  status: {
    client: {
      name: 'ocs-storagecluster',
      clusterId: '428c1c58-5a9f-475d-86a1-87ca83fd4fb7',
      clusterName: 'dr1-may-2-25.devcluster.openshift.com',
      operatorVersion: '4.19.0-52.stable',
      platformVersion: '4.19.0-0.nightly-2025-05-01-165245',
      storageQuotaUtilizationRatio: 0.5,
    },
    lastHeartbeat: '2025-05-02T08:14:00Z',
    onboardingTicketSecret: {
      name: '',
    },
    resourceNameMappingConfigMap: {
      name: 'storageconsumer-internal',
    },
    state: StorageConsumerState.Ready,
  },
};

describe('Storage class distribution patch works as expected', () => {
  it('should return empty patch array when no resources are added(preselected present)', () => {
    const patches = generatePatchToModifyStorageClasses(storageConsumer, [
      'ocs-storagecluster-ceph-rbd',
      'ocs-storagecluster-cephfs',
    ]);
    expect(patches).toEqual([]);
  });
  it('should return replace patch command when resources are removed', () => {
    const patches = generatePatchToModifyStorageClasses(storageConsumer, [
      'ocs-storagecluster-ceph-rbd',
    ]);
    expect(patches).toEqual([
      {
        op: 'replace',
        path: '/spec/storageClasses',
        value: [
          {
            name: 'ocs-storagecluster-ceph-rbd',
          },
        ],
      },
    ]);
  });
  it('should return add patch command when resources are removed', () => {
    const patches = generatePatchToModifyStorageClasses(storageConsumer, [
      'ocs-storagecluster-ceph-rbd',
      'ocs-storagecluster-cephfs',
      'added-sc',
    ]);
    expect(patches).toEqual([
      {
        op: 'add',
        path: '/spec/storageClasses',
        value: [
          {
            name: 'ocs-storagecluster-ceph-rbd',
          },
          {
            name: 'ocs-storagecluster-cephfs',
          },
          {
            name: 'added-sc',
          },
        ],
      },
    ]);
  });
});
