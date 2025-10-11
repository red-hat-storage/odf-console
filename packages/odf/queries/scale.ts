import {
  BreakdownCardFields,
  BreakdownCardFieldsValues,
  BreakdownCardQueryMap,
  ProjectModel,
  NamespaceModel,
  StorageClassModel,
} from '@odf/shared';

export const totalUsedQuery = `sum(
  kubelet_volume_stats_used_bytes
  * on (namespace,persistentvolumeclaim) group_left(storageclass)
    kube_persistentvolumeclaim_info
  * on (storageclass) group_left(provisioner)
    kube_storageclass_info{provisioner=~"spectrumscale.csi.ibm.com"}
)`;

export enum ScaleDashboardQuery {
  BY_USED = 'PROJECTS_BY_USED',
  TOTAL_USED = 'PROJECTS_TOTAL_USED',
}
export const modelByUsedQueryMap = {
  [BreakdownCardFields.PROJECTS]: ScaleDashboardQuery.BY_USED,
  [BreakdownCardFields.STORAGE_CLASSES]: ScaleDashboardQuery.BY_USED,
};

export const modelByTotalQueryMap = {
  [BreakdownCardFields.PROJECTS]: ScaleDashboardQuery.TOTAL_USED,
  [BreakdownCardFields.STORAGE_CLASSES]: ScaleDashboardQuery.TOTAL_USED,
};

export const breakdownQueryMapScale = (): BreakdownCardQueryMap => ({
  [BreakdownCardFields.PROJECTS]: {
    model: ProjectModel,
    metric: 'namespace',
    queries: {
      [ScaleDashboardQuery.BY_USED]: `sum(
  topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes)
  * on (namespace,persistentvolumeclaim) group_left(provisioner)
    (
      kube_persistentvolumeclaim_info
      * on (storageclass) group_left(provisioner)
        kube_storageclass_info{provisioner="spectrumscale.csi.ibm.com"}
    )
) by (namespace)`,
      [ScaleDashboardQuery.TOTAL_USED]: totalUsedQuery,
    },
  },
  [BreakdownCardFields.STORAGE_CLASSES]: {
    model: StorageClassModel,
    metric: 'storageclass',
    queries: {
      [ScaleDashboardQuery.BY_USED]: `sum(
  topk by (namespace,persistentvolumeclaim) (1, kubelet_volume_stats_used_bytes)
  * on (namespace,persistentvolumeclaim) group_left(storageclass, provisioner)
    (
      kube_persistentvolumeclaim_info
      * on (storageclass) group_left(provisioner)
        kube_storageclass_info{provisioner="spectrumscale.csi.ibm.com"}
    )
) by (storageclass, provisioner)`,
      [ScaleDashboardQuery.TOTAL_USED]: totalUsedQuery,
    },
  },
});

export const getBreakdownMetricsQuery = (
  metricType: BreakdownCardFields
): BreakdownCardFieldsValues => {
  const queries = breakdownQueryMapScale();
  if (metricType === BreakdownCardFields.PROJECTS) {
    return {
      model: NamespaceModel,
      metric: 'namespace',
      queries: queries[metricType].queries,
    };
  }
  return {
    model: StorageClassModel,
    metric: 'storageclass',
    queries: queries[metricType].queries,
  };
};
