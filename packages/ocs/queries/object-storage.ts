import { NooBaaBucketClassModel } from '@odf/shared';
import { ProjectModel } from '@odf/shared/models';
import * as _ from 'lodash-es';
import {
  CapacityBreakdown,
  ServiceType,
  Breakdown,
  Metrics,
  POOL_FS_DEFAULT,
} from '../constants';

export enum ObjectServiceDashboardQuery {
  ACCOUNTS_BY_IOPS = 'ACCOUNTS_BY_IOPS',
  ACCOUNTS_BY_LOGICAL_USAGE = 'ACCOUNTS_BY_LOGICAL_USAGE',
  BUCKETS_BY_OTHERS = 'BUCKETS_BY_OTHERS',
  BUCKETS_BY_USED = 'BUCKETS_BY_USED',
  BUCKETS_QUERY = 'BUCKETS_QUERY',
  BUCKETS_TOTAL_USED = 'BUCKETS_TOTAL_USED',
  BUCKET_CLASS_CAPACITY_USAGE_QUERY = 'BUCKET_CLASS_CAPACITY_USAGE_QUERY',
  CAPACITY_USAGE_BUCKET_CLASS_QUERY = 'CAPACITY_USAGE_BUCKET_CLASS_QUERY',
  CAPACITY_USAGE_PROJECT_QUERY = 'CAPACITY_USAGE_PROJECT_QUERY',
  NOOBAA_TOTAL_USED = 'NOOBAA_TOTAL_USED',
  NOOBAA_USED = 'NOOBAA_USED',
  OBJECT_STORAGE_TOTAL_USED = 'OBJECT_STORAGE_TOTAL_USED',
  PROJECTS_BY_USED = 'PROJECTS_BY_USED',
  PROJECTS_OTHERS = 'PROJECTS_OTHERS',
  PROJECTS_QUERY = 'PROJECTS_QUERY',
  PROJECTS_TOTAL_USED = 'PROJECTS_TOTAL_USED',
  PROJECT_CAPACITY_USAGE_QUERY = 'PROJECT_CAPACITY_USAGE_QUERY',
  PROVIDERS_BY_EGRESS = 'PROVIDERS_BY_EGRESS',
  PROVIDERS_BY_IOPS = 'PROVIDERS_BY_IOPS',
  PROVIDERS_BY_PHYSICAL_VS_LOGICAL_USAGE = 'PROVIDERS_BY_PHYSICAL_VS_LOGICAL_USAGE',
  RGW_TOTAL_USED = 'RGW_TOTAL_USED',
  RGW_USED = 'RGW_USED',
  // Data Resiliency Query
  MCG_REBUILD_PROGRESS_QUERY = 'MCG_REBUILD_PROGRESS_QUERY',
  MCG_REBUILD_TIME_QUERY = 'MCG_REBUILD_TIME_QUERY',
  RGW_REBUILD_PROGRESS_QUERY = 'RGW_REBUILD_PROGRESS_QUERY',
}

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const dataResiliencyQueryMap = {
  [ObjectServiceDashboardQuery.MCG_REBUILD_PROGRESS_QUERY]:
    'NooBaa_rebuild_progress/100',
  [ObjectServiceDashboardQuery.MCG_REBUILD_TIME_QUERY]: 'NooBaa_rebuild_time',
  [ObjectServiceDashboardQuery.RGW_REBUILD_PROGRESS_QUERY]: (
    rgwPrefix: string = '',
    managedByOCS: string
  ) =>
    _.template(
      'sum(ceph_pool_metadata{name=~"<%= name %>",managedBy="<%= managedByOCS %>"}*on (job, namespace, pool_id) group_right(name) (ceph_pg_active{managedBy="<%= managedByOCS %>"} and ceph_pg_clean{managedBy="<%= managedByOCS %>"})) / sum(ceph_pool_metadata{name=~"<%= name %>",managedBy="<%= managedByOCS %>"} *on (job, namespace, pool_id) group_right(name) ceph_pg_total{managedBy="<%= managedByOCS %>"})'
    )({
      name: rgwPrefix
        ? `${rgwPrefix}.rgw.*`
        : `(${managedByOCS}-cephblockpool)|(${managedByOCS}-cephfilesystem-${POOL_FS_DEFAULT})`,
      managedByOCS: managedByOCS,
    }),
};

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const MCG_CAPACITY_BREAKDOWN_QUERIES = {
  [ObjectServiceDashboardQuery.PROJECTS_BY_USED]:
    'NooBaa_projects_capacity_usage',
  [ObjectServiceDashboardQuery.BUCKETS_BY_USED]:
    'NooBaa_bucket_class_capacity_usage',
  [ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED]:
    'sum(NooBaa_providers_physical_size)',
  [ObjectServiceDashboardQuery.RGW_TOTAL_USED]: (
    rgwPrefix: string = '',
    managedByOCS: string
  ) =>
    _.template(
      'sum(ceph_pool_metadata{name=~"<%= name %>rgw.buckets.data",managedBy="<%= managedByOCS %>"} *on (job, namespace, pool_id) group_right(name) ceph_pool_stored{managedBy="<%= managedByOCS %>"}) - max(NooBaa_providers_physical_size{type="S3_COMPATIBLE"} or vector(0))'
    )({ name: rgwPrefix ? `${rgwPrefix}.` : '.*', managedByOCS: managedByOCS }),
  [ObjectServiceDashboardQuery.OBJECT_STORAGE_TOTAL_USED]: (
    rgwPrefix: string = '',
    managedByOCS: string
  ) =>
    _.template(
      'sum(ceph_pool_metadata{name=~"<%= name %>rgw.buckets.data",managedBy="<%= managedByOCS %>"} *on (job, namespace, pool_id) group_right(name) ceph_pool_stored{managedBy="<%= managedByOCS %>"}) + max(sum(NooBaa_providers_physical_size{type!="S3_COMPATIBLE"}) or vector(0))'
    )({
      name: rgwPrefix ? `${rgwPrefix}.` : '.*',
      managedByOCS: managedByOCS,
    }),
};

export const breakdownQueryMapMCG = {
  [ServiceType.ALL]: {
    [CapacityBreakdown.Metrics.TOTAL]: {
      model: null,
      metric: '',
      queries: (rgwPrefix: string = '', managedByOCS: string) => ({
        [ObjectServiceDashboardQuery.RGW_TOTAL_USED]: (() =>
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.RGW_TOTAL_USED
          ](rgwPrefix, managedByOCS))(),
        [ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED]:
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED
          ],
        [ObjectServiceDashboardQuery.OBJECT_STORAGE_TOTAL_USED]: (() =>
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.OBJECT_STORAGE_TOTAL_USED
          ](rgwPrefix, managedByOCS))(),
      }),
    },
  },
  [ServiceType.MCG]: {
    [CapacityBreakdown.Metrics.TOTAL]: {
      model: null,
      metric: '',
      queries: {
        [ObjectServiceDashboardQuery.NOOBAA_USED]: `sum(${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED
          ]
        })`,
        [ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED]: `sum(${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.NOOBAA_TOTAL_USED
          ]
        })`,
      },
    },
    [CapacityBreakdown.Metrics.PROJECTS]: {
      model: ProjectModel,
      metric: 'project',
      queries: {
        [ObjectServiceDashboardQuery.PROJECTS_BY_USED]: `sort_desc(topk(5, ${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.PROJECTS_BY_USED
          ]
        }))`,
        [ObjectServiceDashboardQuery.PROJECTS_TOTAL_USED]: `sum(${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.PROJECTS_BY_USED
          ]
        })`,
      },
    },
    [CapacityBreakdown.Metrics.BC]: {
      model: NooBaaBucketClassModel,
      metric: 'bucket_class',
      queries: {
        [ObjectServiceDashboardQuery.BUCKETS_BY_USED]: `sort_desc(topk(5, ${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.BUCKETS_BY_USED
          ]
        }))`,
        [ObjectServiceDashboardQuery.BUCKETS_TOTAL_USED]: `sum(${
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.BUCKETS_BY_USED
          ]
        })`,
      },
    },
  },
  [ServiceType.RGW]: {
    [CapacityBreakdown.Metrics.TOTAL]: {
      model: null,
      metric: '',
      queries: (rgwPrefix: string = '', managedByOCS: string) => ({
        [ObjectServiceDashboardQuery.RGW_TOTAL_USED]: (() =>
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.RGW_TOTAL_USED
          ](rgwPrefix, managedByOCS))(),
        [ObjectServiceDashboardQuery.RGW_USED]: (() =>
          MCG_CAPACITY_BREAKDOWN_QUERIES[
            ObjectServiceDashboardQuery.RGW_TOTAL_USED
          ](rgwPrefix, managedByOCS))(),
      }),
    },
  },
};

// ToDo (epic 4422): This should work (for now) as "managedBy" will be unique,
// but moving forward add a label to metric for CephCluster namespace and use that instead (update query).
export const DATA_CONSUMPTION_QUERIES = {
  [ServiceType.MCG]: {
    [Breakdown.ACCOUNTS]: {
      [Metrics.IOPS]: {
        read: 'topk(5,NooBaa_accounts_usage_read_count)',
        write: 'topk(5,NooBaa_accounts_usage_write_count)',
        totalRead: 'sum(topk(5,NooBaa_accounts_usage_read_count))',
        totalWrite: 'sum(topk(5,NooBaa_accounts_usage_write_count))',
      },
      [Metrics.LOGICAL]: {
        logicalUsage: 'topk(5,NooBaa_accounts_usage_logical)',
        totalLogicalUsage: 'sum(topk(5,NooBaa_accounts_usage_logical))',
      },
    },
    [Breakdown.PROVIDERS]: {
      [Metrics.IOPS]: {
        read: 'topk(5,NooBaa_providers_ops_read_count)',
        write: 'topk(5,NooBaa_providers_ops_write_count)',
        totalRead: 'sum(topk(5,NooBaa_providers_ops_read_count))',
        totalWrite: 'sum(topk(5,NooBaa_providers_ops_write_count))',
      },
      [Metrics.PHY_VS_LOG]: {
        physicalUsage: 'topk(5,NooBaa_providers_physical_size)',
        logicalUsage: 'topk(5,NooBaa_providers_logical_size)',
        totalPhysicalUsage: 'sum(topk(5,NooBaa_providers_physical_size))',
        totalLogicalUsage: 'sum(topk(5,NooBaa_providers_logical_size))',
      },
      [Metrics.EGRESS]: {
        egress:
          'topk(5,NooBaa_providers_bandwidth_read_size_total + NooBaa_providers_bandwidth_write_size_total)',
      },
    },
  },
  [ServiceType.RGW]: (managedByOCS: string) => ({
    [Metrics.LATENCY]: {
      latencyGet: `avg(rate(ceph_rgw_get_initial_lat_sum{managedBy="${managedByOCS}"}[1m])) /avg(rate(ceph_rgw_get_initial_lat_count{managedBy="${managedByOCS}"}[1m])>0)`,
      latencyPut: `avg(rate(ceph_rgw_put_initial_lat_sum{managedBy="${managedByOCS}"}[1m])) /avg(rate(ceph_rgw_put_initial_lat_count{managedBy="${managedByOCS}"}[1m])>0)`,
    },
    [Metrics.BANDWIDTH]: {
      bandwidthGet: `sum(rate(ceph_rgw_get_b{managedBy="${managedByOCS}"}[1m]))`,
      bandwidthPut: `sum(rate(ceph_rgw_put_b{managedBy="${managedByOCS}"}[1m]))`,
    },
  }),
};

export enum ObjectStorageEfficiencyQueries {
  COMPRESSION_RATIO = 'NooBaa_reduction_ratio',
  SAVINGS_QUERY = '(NooBaa_object_savings_logical_size - NooBaa_object_savings_physical_size)',
  LOGICAL_SAVINGS_QUERY = 'NooBaa_object_savings_logical_size',
}

export enum ObjectStorageOverviewQueries {
  NOOBAA_BUCKETS_PROVISIONED = 'job:noobaa_bucket_count:sum',
}

export enum StatusCardQueries {
  HEALTH_QUERY = 'NooBaa_health_status',
  MCG_REBUILD_PROGRESS_QUERY = 'NooBaa_rebuild_progress',
}

export enum Health {
  NOOBAA = 'NOOBAA',
}

export const HEALTH_QUERY = {
  [Health.NOOBAA]: 'NooBaa_health_status',
};
