import * as React from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import { ExternalSystemsSelectModal } from '@odf/core/modals/ConfigureDF/ExternalSystemsModal';
import { storageClusterResource } from '@odf/core/resources';
import { isCapacityAutoScalingAllowed } from '@odf/core/utils';
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
import { CustomKebabItem, Kebab } from '@odf/shared/kebab/kebab';
import {
  InfrastructureModel,
  ODFStorageSystem,
  StorageClusterModel,
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
  getInfrastructurePlatform,
} from '@odf/shared/utils';
import {
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
import { ODF_QUERIES, ODFQueries } from '../../queries';
import { useODFNamespaceSelector } from '../../redux';
import { OperandStatus } from '../utils';
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

type MetricNormalize = (
  systems: StorageSystemKind[],
  latency: PrometheusResponse,
  throughput: PrometheusResponse,
  rawCapacity: PrometheusResponse,
  usedCapacity: PrometheusResponse,
  iops: PrometheusResponse
) => SystemMetrics;

export const normalizeMetrics: MetricNormalize = (
  systems,
  latency,
  throughput,
  rawCapacity,
  usedCapacity,
  iops
) => {
  if (
    _.isEmpty(systems) ||
    !latency ||
    !throughput ||
    !rawCapacity ||
    !usedCapacity ||
    !iops
  ) {
    return {};
  }
  // ToDo (epic 4422): This equality check should work (for now) as "managedBy" will be unique,
  // but moving forward add a label to metric for StorageSystem namespace as well and use that,
  // equality check should be updated with "&&" condition on StorageSystem namespace.
  return systems.reduce<SystemMetrics>((acc, curr) => {
    acc[`${getName(curr)}${getNamespace(curr)}`] = {
      rawCapacity: humanizeBinaryBytes(
        rawCapacity.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      usedCapacity: humanizeBinaryBytes(
        usedCapacity.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      iops: humanizeIOPS(
        iops.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      throughput: humanizeDecimalBytesPerSec(
        throughput.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
      ),
      latency: humanizeLatency(
        latency.data.result.find(
          (item) => item?.metric?.managedBy === curr.spec.name
        )?.value?.[1]
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
      aria-label={t('StorageSystems')}
      columns={columns}
      Row={StorageSystemRow}
    />
  );
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
  const { infrastructure, isLSOInstalled, normalizedMetrics, storageClusters } =
    rowData;

  const storageCluster = storageClusters?.find(
    (storageClusterItem) => getName(storageClusterItem) === obj.spec.name
  );

  const resourceProfile = storageCluster?.spec?.resourceProfile;
  const customKebabItems: CustomKebabItem[] = [
    {
      key: 'ADD_CAPACITY',
      value: t('Add Capacity'),
      component: React.lazy(
        () => import('../../modals/add-capacity/add-capacity-modal')
      ),
    },
    {
      key: 'CONFIGURE_PERFORMANCE',
      value: t('Configure performance'),
      component: React.lazy(
        () =>
          import(
            '@odf/core/modals/configure-performance/configure-performance-modal'
          )
      ),
    },
  ];

  if (
    isCapacityAutoScalingAllowed(
      getInfrastructurePlatform(infrastructure),
      resourceProfile
    )
  ) {
    customKebabItems.push({
      key: 'CAPACITY_AUTOSCALING',
      value: t('Automatic capacity scaling'),
      component: React.lazy(
        () =>
          import(
            '@odf/core/modals/capacity-autoscaling/capacity-autoscaling-modal'
          )
      ),
    });
  }
  if (isLSOInstalled) {
    customKebabItems.push({
      key: 'ATTACH_STORAGE',
      value: t('Attach Storage'),
      redirect: `/odf/system/ns/${systemNamespace}/${referenceForModel(
        StorageClusterModel
      )}/${systemName}/~attachstorage`,
    });
  }
  const metrics =
    normalizedMetrics?.normalizedMetrics?.[`${systemName}${systemNamespace}`];

  const { rawCapacity, usedCapacity, iops, throughput, latency } =
    metrics || {};
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
        {obj?.metadata?.deletionTimestamp ? (
          <Status status="Terminating" />
        ) : (
          <OperandStatus operand={obj} />
        )}
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
          extraProps={{
            resource: obj,
            resourceModel: StorageClusterModel,
            storageCluster,
          }}
          customKebabItems={customKebabItems}
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

  const [storageSystems, loaded, loadError] = useWatchStorageSystems();
  const [data, filteredData, onFilterChange] =
    useListPageFilter(storageSystems);

  const [latency] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.LATENCY],
    basePath: usePrometheusBasePath(),
  });
  const [iops] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.IOPS],
    basePath: usePrometheusBasePath(),
  });
  const [throughput] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.THROUGHPUT],
    basePath: usePrometheusBasePath(),
  });
  const [rawCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.RAW_CAPACITY],
    basePath: usePrometheusBasePath(),
  });
  const [usedCapacity] = useCustomPrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.USED_CAPACITY],
    basePath: usePrometheusBasePath(),
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
        data as any,
        latency,
        throughput,
        rawCapacity,
        usedCapacity,
        iops
      ),
    }),
    [data, iops, latency, rawCapacity, throughput, usedCapacity]
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
            storageClusters,
          }}
        />
      </ListPageBody>
    </>
  );
};
