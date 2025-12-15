import * as React from 'react';
import { IBM_SCALE_NAMESPACE, LSO_OPERATOR } from '@odf/core/constants';
import { ExternalSystemsSelectModal } from '@odf/core/modals/ConfigureDF/ExternalSystemsModal';
import { storageClusterResource } from '@odf/core/resources';
import { ClusterKind } from '@odf/core/types/scale';
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
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  IBMFlashSystemModel,
  InfrastructureModel,
  RemoteClusterModel,
  ODFStorageSystem,
  StorageClusterModel,
  ClusterModel,
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
  GPFS_QUERIES,
  GPFSQueries,
  ODF_QUERIES,
  ODFQueries,
} from '../../queries';
import { useODFNamespaceSelector } from '../../redux';
import { OperandStatus } from '../utils';
import { getActions } from './actions';
import ODFSystemLink from './system-link';

type SystemMetrics = {
  [systeNameAndNamespace: string]: {
    rawCapacity: HumanizeResult;
    usedCapacity: HumanizeResult;
    iops: HumanizeResult;
    throughput: HumanizeResult;
    latency: HumanizeResult;
  };
};

type MetricSet = {
  latency: PrometheusResponse;
  throughput: PrometheusResponse;
  rawCapacity: PrometheusResponse;
  usedCapacity: PrometheusResponse;
  iops: PrometheusResponse;
};

const getLocalClusterStatus = (localCluster: ClusterKind): string | null => {
  if (!localCluster) {
    return null;
  }
  const successCondition = localCluster?.status?.conditions?.find(
    (condition) => condition.type === 'Success'
  );
  if (!successCondition) {
    return null;
  }
  return successCondition.status === 'True' ? 'Healthy' : 'Error';
};

type MetricNormalize = (
  systems: StorageSystemKind[],
  odfMetrics: MetricSet,
  gpfsMetrics: MetricSet
) => SystemMetrics;

export const normalizeMetrics: MetricNormalize = (
  systems,
  odfMetrics,
  gpfsMetrics
) => {
  if (_.isEmpty(systems)) {
    return {};
  }

  const hasOdfMetrics =
    odfMetrics.latency ||
    odfMetrics.throughput ||
    odfMetrics.rawCapacity ||
    odfMetrics.usedCapacity ||
    odfMetrics.iops;
  const hasGpfsMetrics =
    gpfsMetrics.latency ||
    gpfsMetrics.throughput ||
    gpfsMetrics.rawCapacity ||
    gpfsMetrics.usedCapacity ||
    gpfsMetrics.iops;

  if (!hasOdfMetrics && !hasGpfsMetrics) {
    return {};
  }

  // ToDo (epic 4422): This equality check should work (for now) as "managedBy" will be unique,
  // but moving forward add a label to metric for StorageSystem namespace as well and use that,
  // equality check should be updated with "&&" condition on StorageSystem namespace.
  const getHumanizedMetric = (
    humanizeFn: (v: string | number) => HumanizeResult,
    odfMetricResult: PrometheusResponse,
    gpfsMetricResult: PrometheusResponse,
    system: StorageSystemKind
  ) => {
    const { kind } = getGVK(system.spec.kind);
    const isGPFSSystem = kind === ClusterModel.kind.toLowerCase();

    let value: string | undefined;

    if (isGPFSSystem && gpfsMetricResult?.data?.result) {
      const metric = gpfsMetricResult.data.result.find((item) =>
        item?.metric?.gpfs_cluster_name?.startsWith(system.spec.name)
      );
      value = metric?.value?.[1];
    } else if (odfMetricResult?.data?.result) {
      const metric = odfMetricResult.data.result.find(
        (item) => item?.metric?.managedBy === system.spec.name
      );
      value = metric?.value?.[1];
    }

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      Number(value) === 0
    ) {
      return { string: '-', value: 0, unit: '' };
    }
    return humanizeFn(value);
  };

  return systems.reduce<SystemMetrics>((acc, curr) => {
    acc[`${getName(curr)}${getNamespace(curr)}`] = {
      rawCapacity: getHumanizedMetric(
        humanizeBinaryBytes,
        odfMetrics.rawCapacity,
        gpfsMetrics.rawCapacity,
        curr
      ),
      usedCapacity: getHumanizedMetric(
        humanizeBinaryBytes,
        odfMetrics.usedCapacity,
        gpfsMetrics.usedCapacity,
        curr
      ),
      iops: getHumanizedMetric(
        humanizeIOPS,
        odfMetrics.iops,
        gpfsMetrics.iops,
        curr
      ),
      throughput: getHumanizedMetric(
        humanizeDecimalBytesPerSec,
        odfMetrics.throughput,
        gpfsMetrics.throughput,
        curr
      ),
      latency: getHumanizedMetric(
        humanizeLatency,
        odfMetrics.latency,
        gpfsMetrics.latency,
        curr
      ),
    };
    return acc;
  }, {});
};

type CustomData = {
  infrastructure: InfrastructureKind;
  isLSOInstalled: boolean;
  normalizedMetrics: ReturnType<typeof normalizeMetrics>;
  localClusters: ClusterKind[];
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
  const { normalizedMetrics, localClusters } = rowData;
  const { customActions, hiddenActions } = getActions(obj, t);

  const metrics =
    normalizedMetrics?.normalizedMetrics?.[`${systemName}${systemNamespace}`];

  const { rawCapacity, usedCapacity, iops, throughput, latency } =
    metrics || {};

  const isSANSystem = kind === ClusterModel.kind.toLowerCase();
  const localCluster = isSANSystem ? localClusters?.[0] : null;
  const sanStatus = getLocalClusterStatus(localCluster);

  const renderStatus = () => {
    if (obj?.metadata?.deletionTimestamp) {
      return <Status status="Terminating" />;
    }
    if (isSANSystem && sanStatus) {
      return <Status status={sanStatus} />;
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
        {renderStatus()}
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

  const [gpfsLatency] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: GPFS_QUERIES[GPFSQueries.LATENCY],
    basePath: prometheusBasePath,
  });
  const [gpfsIops] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: GPFS_QUERIES[GPFSQueries.IOPS],
    basePath: prometheusBasePath,
  });
  const [gpfsThroughput] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: GPFS_QUERIES[GPFSQueries.THROUGHPUT],
    basePath: prometheusBasePath,
  });
  const [gpfsRawCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: GPFS_QUERIES[GPFSQueries.RAW_CAPACITY],
    basePath: prometheusBasePath,
  });
  const [gpfsUsedCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: GPFS_QUERIES[GPFSQueries.USED_CAPACITY],
    basePath: prometheusBasePath,
  });

  const [localClusters] = useK8sWatchResource<ClusterKind[]>({
    kind: referenceForModel(ClusterModel),
    isList: true,
    namespace: IBM_SCALE_NAMESPACE,
  });

  const [infrastructure] = useK8sGet<InfrastructureKind>(
    InfrastructureModel,
    DEFAULT_INFRASTRUCTURE
  );
  const [storageClusters] = useK8sWatchResource<StorageClusterKind[]>(
    storageClusterResource
  );

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
          latency: gpfsLatency,
          throughput: gpfsThroughput,
          rawCapacity: gpfsRawCapacity,
          usedCapacity: gpfsUsedCapacity,
          iops: gpfsIops,
        }
      ),
    }),
    [
      data,
      iops,
      latency,
      rawCapacity,
      throughput,
      usedCapacity,
      gpfsIops,
      gpfsLatency,
      gpfsRawCapacity,
      gpfsThroughput,
      gpfsUsedCapacity,
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
            {t('Create External system')}
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
            localClusters,
            storageClusters,
          }}
        />
      </ListPageBody>
    </>
  );
};
