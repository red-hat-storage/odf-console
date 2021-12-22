import * as React from 'react';
import { KebabMenu } from '@odf/shared/list/kebab';
import { ClusterServiceVersionModel } from '@odf/shared/models';
import { Status } from '@odf/shared/status/Status';
import {
  getGVK,
  referenceForGroupVersionKind,
  referenceForModel,
} from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateButton,
  ListPageFilter,
  ListPageHeader,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { PrometheusEndpoint } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import classNames from 'classnames';
import * as fuzzy from 'fuzzysearch';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { sortable, wrappable } from '@patternfly/react-table';
import { ODFStorageSystem } from '../../models/odf';
import { ODF_QUERIES, ODFQueries } from '../../queries';
import { StorageSystemKind } from '../../types';
import { normalizeMetrics } from './odf-system-list';
import { OperandStatus } from './status';
import ODFSystemLink from './system-link';

const StorageSystemResource = {
  isList: true,
  kind: referenceForModel(ODFStorageSystem),
};

const tableColumnsInfo = [
  { className: 'pf-u-w-15-on-xl', id: 'name' },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-md',
      'pf-u-w-12-on-xl'
    ),
    id: 'status',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-lg',
      'pf-u-w-12-on-xl'
    ),
    id: 'raw-capacity',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-lg',
      'pf-u-w-12-on-xl'
    ),
    id: 'used-capacity',
  },
  {
    className: classNames(
      'pf-m-hidden,',
      'pf-m-visible-on-lg',
      'pf-u-w-12-on-xl'
    ),
    id: 'iops',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-lg',
      'pf-u-w-12-on-xl'
    ),
    id: 'throughput',
  },
  {
    className: classNames(
      'pf-m-hidden,',
      'pf-m-visible-on-lg',
      'pf-u-w-12-on-xl'
    ),
    id: 'latency',
  },
  {
    className: 'dropdown-kebab-pf pf-c-table__action',
    id: 'kebab',
  },
];

type StorageSystemTableProps = {
  data: StorageSystemKind[];
  unfilteredData: StorageSystemKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

export const StorageSystemTable: React.FC<StorageSystemTableProps> = (
  props
) => {
  const { t } = useTranslation();
  const SystemTableColumn = React.useMemo<TableColumn<StorageSystemKind>[]>(
    () => [
      {
        title: t('ceph-storage-plugin~Name'),
        sort: 'metadata.name',
        transforms: [sortable, wrappable],
        props: { className: tableColumnsInfo[0].className },
        id: tableColumnsInfo[0].id,
      },
      {
        title: t('ceph-storage-plugin~Status'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[1].className },
        id: tableColumnsInfo[1].id,
      },
      {
        title: t('ceph-storage-plugin~Raw Capacity'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[2].className },
        id: tableColumnsInfo[2].id,
      },
      {
        title: t('ceph-storage-plugin~Used capacity'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[3].className },
        id: tableColumnsInfo[3].id,
      },
      {
        title: t('ceph-storage-plugin~IOPS'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[4].className },
        id: tableColumnsInfo[4].id,
      },
      {
        title: t('ceph-storage-plugin~Throughput'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[5].className },
        id: tableColumnsInfo[4].id,
      },
      {
        title: t('ceph-storage-plugin~Latency'),
        transforms: [wrappable],
        props: { className: tableColumnsInfo[6].className },
        id: tableColumnsInfo[6].id,
      },
      {
        title: '',
        props: { className: tableColumnsInfo[7].className },
        id: tableColumnsInfo[7].id,
      },
    ],
    [t]
  );
  const [columns] = useActiveColumns({
    columns: SystemTableColumn,
    showNamespaceOverride: false,
    columnManagementID: 'ODF_SS',
  });
  return (
    <VirtualizedTable<StorageSystemKind>
      {...props}
      aria-label="StorageSystem"
      columns={columns}
      Row={StorageSystemTableRow}
    />
  );
};

const StorageSystemTableRow: React.FC<RowProps<StorageSystemKind, any>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { apiGroup, apiVersion, kind } = getGVK(obj.spec.kind);
  const systemKind = referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
  const systemName = obj?.metadata?.name;
  const { normalizedMetrics } = rowData as any;

  const { rawCapacity, usedCapacity, iops, throughput, latency } =
    normalizedMetrics?.[systemName] || {};

  return (
    <>
      <TableData {...tableColumnsInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ODFSystemLink
          kind={systemKind}
          systemName={systemName}
          providerName={systemName}
        />
      </TableData>
      <TableData {...tableColumnsInfo[1]} activeColumnIDs={activeColumnIDs}>
        {obj?.metadata?.deletionTimestamp ? (
          <Status status="Terminating" />
        ) : (
          <OperandStatus operand={obj} />
        )}
      </TableData>
      <TableData {...tableColumnsInfo[2]} activeColumnIDs={activeColumnIDs}>
        {rawCapacity?.string || '-'}
      </TableData>
      <TableData {...tableColumnsInfo[3]} activeColumnIDs={activeColumnIDs}>
        {usedCapacity?.string || '-'}
      </TableData>
      <TableData {...tableColumnsInfo[4]} activeColumnIDs={activeColumnIDs}>
        {iops?.string || '-'}
      </TableData>
      <TableData {...tableColumnsInfo[5]} activeColumnIDs={activeColumnIDs}>
        {throughput?.string || '-'}
      </TableData>
      <TableData {...tableColumnsInfo[6]} activeColumnIDs={activeColumnIDs}>
        {latency?.string || '-'}
      </TableData>
      <TableData {...tableColumnsInfo[7]} activeColumnIDs={activeColumnIDs}>
        <KebabMenu<StorageSystemKind>
          actions={[
            {
              actionName: 'Press Me',
              onClick: (resource) => console.log(resource),
            },
            {
              actionName: 'Add Capacity',
              // eslint-disable-next-line react/display-name
              onClick: (resource) => {},
            },
          ]}
          resource={obj}
        />
      </TableData>
    </>
  );
};
export const fuzzyCaseInsensitive = (a: string, b: string): boolean =>
  fuzzy(_.toLower(a), _.toLower(b));

const nameFilter = (filter, obj) =>
  fuzzyCaseInsensitive(filter.selected?.[0], obj.metadata.name);

export const StorageSystemListPage: React.FC = () => {
  const [systems, loaded, loadError] = useK8sWatchResource<StorageSystemKind[]>(
    StorageSystemResource
  );

  const [latency, , latLoading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.LATENCY],
  });
  const [iops, , iopsLoading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.IOPS],
  });
  const [throughput, , throughputLoading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.THROUGHPUT],
  });
  const [rawCapacity, , rawCapacityLoading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.RAW_CAPACITY],
  });
  const [usedCapacity, , usedCapacityLoading] = usePrometheusPoll({
    endpoint: PrometheusEndpoint.QUERY,
    query: ODF_QUERIES[ODFQueries.USED_CAPACITY],
  });

  const normalizedMetrics = React.useMemo(
    () => ({
      normalizedMetrics: normalizeMetrics(
        systems,
        latency,
        throughput,
        rawCapacity,
        usedCapacity,
        iops
      ),
    }),
    [systems, iops, latency, rawCapacity, throughput, usedCapacity]
  );
  const ssFilter = [{ type: 'name', filter: nameFilter }];
  const [data, filteredData, onFilterChange] = useListPageFilter(
    systems,
    ssFilter as any
  );
  return (
    <>
      <ListPageHeader title={null}>
        <ListPageCreateButton
          onClick={() =>
            history.replaceState(
              `/k8s/ns/openshift-storage/${referenceForModel(
                ClusterServiceVersionModel
              )}/odf-operator/${referenceForModel(ODFStorageSystem)}/~new`,
              ''
            )
          }
        >
          Create StorageSystem
        </ListPageCreateButton>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded || !usedCapacityLoading}
          onFilterChange={onFilterChange}
          hideLabelFilter={true}
          hideColumnManagement={true}
        />
        <StorageSystemTable
          data={filteredData}
          unfilteredData={systems}
          loaded={loaded}
          loadError={loadError}
          rowData={{ normalizedMetrics }}
        />
      </ListPageBody>
    </>
  );
};
