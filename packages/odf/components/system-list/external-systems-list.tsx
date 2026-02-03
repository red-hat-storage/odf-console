import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import { ExternalSystemsSelectModal } from '@odf/core/modals/ConfigureDF/ExternalSystemsModal';
import { FDF_FLAG } from '@odf/core/redux';
import { storageClusterResource } from '@odf/core/resources';
import {
  DEFAULT_INFRASTRUCTURE,
  InfrastructureKind,
  StorageClusterKind,
  useFetchCsv,
  useK8sGet,
} from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  SAN_CLUSTER_NAME_ANNOTATION,
  useWatchStorageSystems,
} from '@odf/shared/hooks/useWatchStorageSystems';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  IBMFlashSystemModel,
  InfrastructureModel,
  RemoteClusterModel,
  ODFStorageSystem,
  StorageClusterModel,
  ClusterModel,
  FileSystemModel,
} from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { Status } from '@odf/shared/status/Status';
import { HumanizeResult, StorageSystemKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeIOPS,
  humanizeLatency,
  referenceForGroupVersionKind,
  referenceForModel,
  getGVK,
  isCSVSucceeded,
} from '@odf/shared/utils';
import {
  K8sModel,
  ListPageBody,
  ListPageFilter,
  ListPageHeader,
  PrometheusEndpoint,
  PrometheusResponse,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useFlag,
  useK8sWatchResource,
  useListPageFilter,
  useModal,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import classNames from 'classnames';
import * as _ from 'lodash-es';
import { Button } from '@patternfly/react-core';
import { sortable, wrappable } from '@patternfly/react-table';
import {
  ODF_QUERIES,
  ODFQueries,
  SCALE_QUERIES,
  ScaleQueries,
  ScaleHealthStatus,
} from '../../queries';
import { useODFNamespaceSelector } from '../../redux';
import { FileSystemKind } from '../../types/scale';
import { OperandStatus } from '../utils';
import { getActions } from './actions';
import ODFSystemLink from './system-link';

type SystemMetrics = {
  [systemNameAndNamespace: string]: {
    rawCapacity: HumanizeResult;
    usedCapacity: HumanizeResult;
    iops: HumanizeResult;
    throughput: HumanizeResult;
    latency: HumanizeResult;
    healthStatus?: string;
  };
};

type MetricSet = {
  latency: PrometheusResponse;
  throughput: PrometheusResponse;
  rawCapacity: PrometheusResponse;
  usedCapacity: PrometheusResponse;
  iops: PrometheusResponse;
  health?: PrometheusResponse;
};

type FilesystemsByRemoteCluster = {
  [remoteClusterName: string]: string[];
};

const EMPTY_METRIC: HumanizeResult = { string: '-', value: 0, unit: '' };

const getHealthStatusFromMetric = (
  healthValue: number | undefined
): string | undefined => {
  if (healthValue === undefined || Number.isNaN(healthValue)) {
    return undefined;
  }
  if (healthValue <= ScaleHealthStatus.HEALTHY) {
    return 'Ready';
  }
  if (healthValue <= ScaleHealthStatus.DEGRADED) {
    return 'Warning';
  }
  return 'Error';
};

type MetricNormalize = (
  systems: StorageSystemKind[],
  odfMetrics: MetricSet,
  scaleMetrics: MetricSet,
  filesystemsByRemoteCluster: FilesystemsByRemoteCluster
) => SystemMetrics;

export const normalizeMetrics: MetricNormalize = (
  systems,
  odfMetrics,
  scaleMetrics,
  filesystemsByRemoteCluster
) => {
  if (_.isEmpty(systems)) {
    return {};
  }

  const hasMetrics = (metrics: MetricSet): boolean =>
    !!(
      metrics.latency ||
      metrics.throughput ||
      metrics.rawCapacity ||
      metrics.usedCapacity ||
      metrics.iops ||
      metrics.health
    );

  if (!hasMetrics(odfMetrics) && !hasMetrics(scaleMetrics)) {
    return {};
  }

  const getHumanizedMetric = (
    humanizeFn: (v: string | number) => HumanizeResult,
    odfMetricResult: PrometheusResponse,
    scaleMetricResult: PrometheusResponse,
    system: StorageSystemKind,
    isSANSystem: boolean,
    isRemoteClusterSystem: boolean
  ) => {
    const isLatencyMetric = humanizeFn === humanizeLatency;

    let value: string | undefined;

    const aggregateMetrics = (
      metrics: { value?: [number, string] }[]
    ): string | undefined => {
      if (!metrics.length) {
        return undefined;
      }
      const sum = metrics.reduce((acc, item) => {
        const metricValue = Number(item?.value?.[1] || 0);
        return acc + metricValue;
      }, 0);
      return isLatencyMetric
        ? (sum / metrics.length).toString()
        : sum.toString();
    };

    if (isSANSystem && scaleMetricResult?.data?.result) {
      const sanClusterName =
        system.metadata?.annotations?.[SAN_CLUSTER_NAME_ANNOTATION];
      const matchingMetrics = scaleMetricResult.data.result.filter(
        (item) => item?.metric?.gpfs_cluster_name === sanClusterName
      );
      value = aggregateMetrics(matchingMetrics);
    } else if (isRemoteClusterSystem && scaleMetricResult?.data?.result) {
      const filesystemNames =
        filesystemsByRemoteCluster[system.spec.name] || [];
      const matchingMetrics = scaleMetricResult.data.result.filter((item) =>
        filesystemNames.includes(item?.metric?.gpfs_fs_name)
      );
      value = aggregateMetrics(matchingMetrics);
    } else if (odfMetricResult?.data?.result) {
      const metric = odfMetricResult.data.result.find(
        (item) => item?.metric?.managedBy === system.spec.name
      );
      value = metric?.value?.[1];
    }

    if (value == null) {
      return EMPTY_METRIC;
    }
    return humanizeFn(value);
  };

  const getMaxMetricValue = (
    metrics: { value?: [number, string] }[]
  ): number | undefined => {
    const values = metrics
      .map((metric) => Number(metric?.value?.[1]))
      .filter((value) => Number.isFinite(value));
    return values.length ? Math.max(...values) : undefined;
  };

  const getSystemHealthStatus = (
    system: StorageSystemKind,
    isSANSystem: boolean,
    isRemoteClusterSystem: boolean
  ): string | undefined => {
    if (!(isSANSystem || isRemoteClusterSystem)) {
      return undefined;
    }

    if (!scaleMetrics.health?.data?.result?.length) {
      return undefined;
    }

    let matchingMetrics: { value?: [number, string] }[];

    if (isSANSystem) {
      const sanClusterName =
        system.metadata?.annotations?.[SAN_CLUSTER_NAME_ANNOTATION];
      matchingMetrics = scaleMetrics.health.data.result.filter(
        (item) => item?.metric?.gpfs_cluster_name === sanClusterName
      );
    } else {
      const filesystemNames =
        filesystemsByRemoteCluster[system.spec.name] || [];
      matchingMetrics = scaleMetrics.health.data.result.filter((item) =>
        filesystemNames.includes(item?.metric?.gpfs_health_entity)
      );
    }

    return getHealthStatusFromMetric(getMaxMetricValue(matchingMetrics));
  };

  return systems.reduce<SystemMetrics>((acc, curr) => {
    const { kind } = getGVK(curr.spec.kind);
    const isSANSystem = kind === ClusterModel.kind.toLowerCase();
    const isRemoteClusterSystem =
      kind === RemoteClusterModel.kind.toLowerCase();

    acc[`${getName(curr)}${getNamespace(curr)}`] = {
      rawCapacity: getHumanizedMetric(
        humanizeBinaryBytes,
        odfMetrics.rawCapacity,
        scaleMetrics.rawCapacity,
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
      usedCapacity: getHumanizedMetric(
        humanizeBinaryBytes,
        odfMetrics.usedCapacity,
        scaleMetrics.usedCapacity,
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
      iops: getHumanizedMetric(
        humanizeIOPS,
        odfMetrics.iops,
        scaleMetrics.iops,
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
      throughput: getHumanizedMetric(
        humanizeDecimalBytesPerSec,
        odfMetrics.throughput,
        scaleMetrics.throughput,
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
      latency: getHumanizedMetric(
        humanizeLatency,
        odfMetrics.latency,
        scaleMetrics.latency,
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
      healthStatus: getSystemHealthStatus(
        curr,
        isSANSystem,
        isRemoteClusterSystem
      ),
    };
    return acc;
  }, {});
};

type CustomData = {
  infrastructure: InfrastructureKind;
  isLSOInstalled: boolean;
  normalizedMetrics: ReturnType<typeof normalizeMetrics>;
  storageClusters: StorageClusterKind[];
};

type StorageSystemNewPageProps = {
  data: StorageSystemKind[];
  unfilteredData: StorageSystemKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'status' },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-sm'),
    id: 'rawCapacity',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-md'),
    id: 'usedCapacity',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'iops',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'throughput',
  },
  { className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'), id: 'latency' },
  { className: Kebab.columnClass, id: '' },
];

const StorageSystemList: React.FC<StorageSystemNewPageProps> = (props) => {
  const { t } = useCustomTranslation();
  const storageSystemTableColumns = React.useMemo<
    TableColumn<StorageSystemKind>[]
  >(
    () => [
      {
        title: t('Name'),
        sort: 'metadata.name',
        transforms: [sortable],
        props: {
          className: tableColumnInfo[0].className,
        },
        id: tableColumnInfo[0].id,
      },
      {
        title: t('Status'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Raw Capacity'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Used capacity'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('IOPS'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
      {
        title: t('Throughput'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[5].className,
        },
        id: tableColumnInfo[5].id,
      },
      {
        title: t('Latency'),
        props: {
          className: tableColumnInfo[6].className,
        },
        id: tableColumnInfo[6].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[7].className,
        },
        id: tableColumnInfo[7].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: storageSystemTableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      {...props}
      aria-label={t('Storage systems')}
      columns={columns}
      Row={StorageSystemRow}
    />
  );
};

const getModelOfExternalSystem = (obj: StorageSystemKind): K8sModel => {
  const { kind } = getGVK(obj.spec.kind);
  if (kind === IBMFlashSystemModel.kind.toLowerCase()) {
    return IBMFlashSystemModel;
  }
  if (kind === StorageClusterModel.kind.toLowerCase()) {
    return StorageClusterModel;
  }
  if (kind === RemoteClusterModel.kind.toLowerCase()) {
    return RemoteClusterModel;
  }
  if (kind === ClusterModel.kind.toLowerCase()) {
    return ClusterModel;
  }
  throw new Error(`Unknown external system kind: ${kind}`);
};

const StorageSystemRow: React.FC<RowProps<StorageSystemKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();
  const { apiGroup, apiVersion, kind } = getGVK(obj.spec.kind);
  const systemKind = referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
  const systemName = getName(obj);
  const systemNamespace = getNamespace(obj);
  const { normalizedMetrics } = rowData;
  const { customActions, hiddenActions } = getActions(obj, t);

  const metrics =
    normalizedMetrics?.normalizedMetrics?.[`${systemName}${systemNamespace}`];

  const { rawCapacity, usedCapacity, iops, throughput, latency, healthStatus } =
    metrics || {};

  const isSANSystem = kind === ClusterModel.kind.toLowerCase();
  const isRemoteCluster = kind === RemoteClusterModel.kind.toLowerCase();

  const getStatusComponent = (): React.ReactNode => {
    if (obj?.metadata?.deletionTimestamp) {
      return <Status status="Terminating" />;
    }
    if ((isSANSystem || isRemoteCluster) && healthStatus) {
      return <Status status={healthStatus} />;
    }
    return <OperandStatus operand={obj} />;
  };

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ODFSystemLink
          kind={systemKind}
          systemName={systemName}
          providerName={systemName}
        />
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        {getStatusComponent()}
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        {rawCapacity?.string || '-'}
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {usedCapacity?.string || '-'}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {iops?.string || '-'}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        {throughput?.string || '-'}
      </TableData>
      <TableData {...tableColumnInfo[6]} activeColumnIDs={activeColumnIDs}>
        {latency?.string || '-'}
      </TableData>
      <TableData {...tableColumnInfo[7]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          customKebabItems={customActions}
          hideItems={hiddenActions}
          extraProps={{
            resource: obj,
            resourceModel: getModelOfExternalSystem(obj),
          }}
          customLabel={ODFStorageSystem.label}
        />
      </TableData>
    </>
  );
};

export const StorageSystemListPage: React.FC = () => {
  const { t } = useCustomTranslation();

  const launchModal = useModal();
  const isFDF = useFlag(FDF_FLAG);

  const { odfNamespace, isODFNsLoaded, odfNsLoadError } =
    useODFNamespaceSelector();

  const [storageSystems, loaded, loadError] = useWatchStorageSystems(true);
  const [data, filteredData, onFilterChange] =
    useListPageFilter(storageSystems);

  const prometheusBasePath = usePrometheusBasePath();

  const [latency] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.LATENCY],
    basePath: prometheusBasePath,
  });
  const [iops] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.IOPS],
    basePath: prometheusBasePath,
  });
  const [throughput] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.THROUGHPUT],
    basePath: prometheusBasePath,
  });
  const [rawCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.RAW_CAPACITY],
    basePath: prometheusBasePath,
  });
  const [usedCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.USED_CAPACITY],
    basePath: prometheusBasePath,
  });

  const scaleQueries = React.useMemo(
    () =>
      isFDF
        ? {
            latency: SCALE_QUERIES[ScaleQueries.LATENCY],
            iops: SCALE_QUERIES[ScaleQueries.IOPS],
            throughput: SCALE_QUERIES[ScaleQueries.THROUGHPUT],
            rawCapacity: SCALE_QUERIES[ScaleQueries.RAW_CAPACITY],
            usedCapacity: SCALE_QUERIES[ScaleQueries.USED_CAPACITY],
            health: SCALE_QUERIES[ScaleQueries.HEALTH],
          }
        : null,
    [isFDF]
  );

  const [scaleLatency] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.latency,
    basePath: prometheusBasePath,
  });
  const [scaleIops] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.iops,
    basePath: prometheusBasePath,
  });
  const [scaleThroughput] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.throughput,
    basePath: prometheusBasePath,
  });
  const [scaleRawCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.rawCapacity,
    basePath: prometheusBasePath,
  });
  const [scaleUsedCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.usedCapacity,
    basePath: prometheusBasePath,
  });
  const [scaleHealth] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: scaleQueries?.health,
    basePath: prometheusBasePath,
  });

  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>(
    storageClusterResource
  );

  const filesystemResource = isFDF
    ? {
        kind: referenceForModel(FileSystemModel),
        isList: true,
        namespaced: false,
      }
    : null;

  const [filesystems, filesystemsLoaded] =
    useK8sWatchResource<FileSystemKind[]>(filesystemResource);

  const filesystemsByRemoteCluster = React.useMemo(() => {
    if (!isFDF || !filesystemsLoaded || !filesystems) {
      return {};
    }
    return filesystems.reduce<FilesystemsByRemoteCluster>((acc, fs) => {
      const remoteClusterName = fs.spec?.remote?.cluster;
      if (!remoteClusterName) {
        return acc;
      }
      // SAN exporter uses the K8s Filesystem resource name as gpfs_fs_name.
      const filesystemName = getName(fs);
      acc[remoteClusterName] = [
        ...(acc[remoteClusterName] || []),
        filesystemName,
      ];
      return acc;
    }, {});
  }, [isFDF, filesystems, filesystemsLoaded]);

  const normalizedMetrics = React.useMemo(
    () => ({
      normalizedMetrics: normalizeMetrics(
        data as StorageSystemKind[],
        {
          latency,
          throughput,
          rawCapacity,
          usedCapacity,
          iops,
        },
        {
          latency: scaleLatency,
          throughput: scaleThroughput,
          rawCapacity: scaleRawCapacity,
          usedCapacity: scaleUsedCapacity,
          iops: scaleIops,
          health: scaleHealth,
        },
        filesystemsByRemoteCluster
      ),
    }),
    [
      data,
      iops,
      latency,
      rawCapacity,
      throughput,
      usedCapacity,
      scaleIops,
      scaleLatency,
      scaleRawCapacity,
      scaleThroughput,
      scaleUsedCapacity,
      scaleHealth,
      filesystemsByRemoteCluster,
    ]
  );

  const [lsoCSV, lsoCSVLoaded, lsoCSVLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });

  const isLSOInstalled =
    lsoCSVLoaded && !lsoCSVLoadError && isCSVSucceeded(lsoCSV);

  return (
    <>
      <ListPageHeader title={t('External systems')}>
        {odfNamespace && (
          <Button
            variant="primary"
            onClick={() => {
              launchModal(ExternalSystemsSelectModal, {});
            }}
          >
            {t('Connect external system')}
          </Button>
        )}
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded && isODFNsLoaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <StorageSystemList
          data={filteredData as StorageSystemKind[]}
          unfilteredData={storageSystems}
          loaded={loaded && isODFNsLoaded}
          loadError={loadError || odfNsLoadError}
          rowData={{
            infrastructure,
            isLSOInstalled,
            normalizedMetrics,
            storageClusters,
          }}
        />
      </ListPageBody>
    </>
  );
};
