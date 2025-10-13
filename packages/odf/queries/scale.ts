import { BreakdownCardFields } from '@odf/shared';

export const totalUsedQuery = `sum(
  kubelet_volume_stats_used_bytes
  * on (namespace,persistentvolumeclaim) group_left(storageclass)
    kube_persistentvolumeclaim_info
  * on (storageclass) group_left(provisioner)
    kube_storageclass_info{provisioner=~"spectrumscale.csi.ibm.com"}
)`;

export enum ScaleDashboardQuery {
  BY_USED = 'NAMESPACE_BY_USED',
  TOTAL_USED = 'TOTAL_USED',
}

export const modelByTotalQueryMap = {
  [BreakdownCardFields.PROJECTS]: ScaleDashboardQuery.TOTAL_USED,
  [BreakdownCardFields.STORAGE_CLASSES]: ScaleDashboardQuery.TOTAL_USED,
};

export const breakdownQuery = (
  storageClassName: string
): {
  [key: string]: string;
} => ({
  [ScaleDashboardQuery.BY_USED]: `
        topk(5,
          sum(
            kubelet_volume_stats_used_bytes
            * on (persistentvolumeclaim, namespace) group_left(storageclass)
              kube_persistentvolumeclaim_info{storageclass="${storageClassName}"}
          ) by (namespace)
        )
      `,
  [ScaleDashboardQuery.TOTAL_USED]: totalUsedQuery,
});

export const getBreakdownByStorageClass = (storageClassName: string) => {
  return breakdownQuery(storageClassName);
};
