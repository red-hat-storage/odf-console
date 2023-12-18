import { PersistentVolumeClaimModel } from '@odf/shared/models';
import {
  BreakdownCardFields,
  BreakdownCardFieldsWithParams,
} from '@odf/shared/queries';
import {
  getBreakdownMetricsQuery,
  breakdownQueryMapCEPH,
  getPVCNamespaceQuery,
  StorageDashboardQuery,
} from './ceph-storage';

describe('tests for get breakdown metrics query', () => {
  it('should return correct query for PVCS', () => {
    const metricType = BreakdownCardFieldsWithParams.PVCS;
    const namespace = 'example-namespace';
    const scPrefix = 'test-prefix';
    const result = getBreakdownMetricsQuery(metricType, scPrefix, namespace);

    expect(result).toEqual({
      model: PersistentVolumeClaimModel,
      metric: 'persistentvolumeclaim',
      queries: getPVCNamespaceQuery(namespace, scPrefix),
    });
  });

  it('should return correct query for other metric types', () => {
    const metricType = BreakdownCardFields.PODS;
    const scPrefix = 'test-prefix';
    const result = getBreakdownMetricsQuery(metricType, scPrefix);

    expect(result).toEqual(
      breakdownQueryMapCEPH(scPrefix, scPrefix)[metricType]
    );
  });
});

describe('tests for get pvc namespace query method', () => {
  it('should return queries with an empty namespace', () => {
    const namespace = '';
    const scPrefix = 'test-prefix';
    const result = getPVCNamespaceQuery(namespace, scPrefix);

    expect(result).toEqual({
      [StorageDashboardQuery.PVC_NAMESPACES_BY_USED]: `sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${scPrefix}.*"}))`,
      [StorageDashboardQuery.PVC_NAMESPACES_TOTAL_USED]: `sum(sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${scPrefix}.*"})))`,
    });
  });

  it('should return queries with a non-empty namespace', () => {
    const namespace = 'example-namespace';
    const scPrefix = 'test-prefix';
    const result = getPVCNamespaceQuery(namespace, scPrefix);

    expect(result).toEqual({
      [StorageDashboardQuery.PVC_NAMESPACES_BY_USED]: `sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${scPrefix}.*"}))`,
      [StorageDashboardQuery.PVC_NAMESPACES_TOTAL_USED]: `sum(sum by (namespace, persistentvolumeclaim) (kubelet_volume_stats_used_bytes{namespace='${namespace}'} * on (namespace, persistentvolumeclaim) group_left(storageclass, provisioner) (kube_persistentvolumeclaim_info * on (storageclass) group_left(provisioner) kube_storageclass_info {provisioner=~"(.*rbd.csi.ceph.com)|(.*cephfs.csi.ceph.com)|(.*ceph.rook.io/block)",storageclass=~"${scPrefix}.*"})))`,
    });
  });
});
