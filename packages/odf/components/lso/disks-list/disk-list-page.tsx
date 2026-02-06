import * as React from 'react';
import {
  DiskMetadata,
  DiskStates,
  LocalVolumeDiscoveryResultKind,
} from '@odf/core/types';
import {
  createLocalVolumeDiscovery,
  updateLocalVolumeDiscovery,
} from '@odf/core/utils';
import {
  getLabel,
  getName,
  getNamespace,
  LocalVolumeDiscoveryResult,
  SubscriptionKind,
  SubscriptionModel,
  useCustomTranslation,
  useDeepCompareMemoize,
} from '@odf/shared';
import {
  getNodeRoles,
  humanizeBinaryBytes,
  referenceForModel,
} from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageFilter,
  ListPageHeader,
  NodeKind,
  RowFilter,
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  useK8sWatchResource,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import cx from 'classnames';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';
import { Button, EmptyState, EmptyStateVariant } from '@patternfly/react-core';
import { sortable, wrappable } from '@patternfly/react-table';

export const tableColumnInfo = [
  { classNames: '', id: 'name' },
  { classNames: '', id: 'state' },
  { classNames: cx('pf-m-hidden', 'pf-m-visible-on-xl'), id: 'type' },
  { classNames: cx('pf-m-hidden', 'pf-m-visible-on-2xl'), id: 'model' },
  { classNames: cx('pf-m-hidden', 'pf-m-visible-on-2xl'), id: 'capacity' },
  { classNames: cx('pf-m-hidden', 'pf-m-visible-on-2xl'), id: 'filesystem' },
];

const diskHeader = (t: TFunction): TableColumn<DiskMetadata>[] => [
  {
    title: t('Name'),
    sort: 'path',
    transforms: [sortable],
    props: { className: tableColumnInfo[0].classNames },
    id: tableColumnInfo[0].id,
  },
  {
    title: t('Disk State'),
    sort: 'status.state',
    transforms: [sortable, wrappable],
    props: { className: tableColumnInfo[1].classNames },
    id: tableColumnInfo[1].id,
  },
  {
    title: t('Type'),
    sort: 'type',
    transforms: [sortable, wrappable],
    props: { className: tableColumnInfo[2].classNames },
    id: tableColumnInfo[2].id,
  },
  {
    title: t('Model'),
    sort: 'model',
    transforms: [sortable, wrappable],
    props: { className: tableColumnInfo[3].classNames },
    id: tableColumnInfo[3].id,
  },
  {
    title: t('Capacity'),
    sort: 'size',
    transforms: [sortable, wrappable],
    props: { className: tableColumnInfo[4].classNames },
    id: tableColumnInfo[4].id,
  },
  {
    title: t('Filesystem'),
    sort: 'fstype',
    transforms: [sortable, wrappable],
    props: { className: tableColumnInfo[5].classNames },
    id: tableColumnInfo[5].id,
  },
];

const DiskRow: React.FC<RowProps<DiskMetadata>> = ({
  obj,
  activeColumnIDs,
}) => (
  <>
    <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
      {obj.path}
    </TableData>
    <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
      {obj.status.state}
    </TableData>
    <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
      {obj.type || '-'}
    </TableData>
    <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
      {obj.model || '-'}
    </TableData>
    <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
      {humanizeBinaryBytes(obj.size).string || '-'}
    </TableData>
    <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
      {obj.fstype || '-'}
    </TableData>
  </>
);

type DiskListProps = {
  data: DiskMetadata[];
  unfilteredData: DiskMetadata[];
  loadError: any;
  loaded: boolean;
  rowData: any;
  EmptyMsg: any;
};
const DisksList: React.FC<DiskListProps> = (props) => {
  const { t } = useCustomTranslation();
  const [columns] = useActiveColumns({
    columns: diskHeader(t),
    showNamespaceOverride: false,
    columnManagementID: null,
  });
  return (
    <VirtualizedTable
      {...props}
      aria-label={t('Disks List')}
      columns={columns}
      Row={DiskRow}
    />
  );
};

export const NodesDisksListPage: React.FC<{ obj: NodeKind }> = ({ obj }) => {
  const { t } = useCustomTranslation();

  const [lvdRequestError, setError] = React.useState('');
  const [lvdRequestInProgress, setProgress] = React.useState(false);
  const [subscription, subscriptionLoaded, subscriptionLoadError] =
    useK8sWatchResource<SubscriptionKind[]>({
      kind: referenceForModel(SubscriptionModel),
      fieldSelector: 'metadata.name=local-storage-operator',
      isList: true,
    });

  const operatorNs = getNamespace(subscription?.[0]);
  const csvName = subscription?.[0]?.status?.installedCSV;
  const nodeName = getName(obj);
  const nodeRole = getNodeRoles(obj);

  const [lvdResults, loaded, loadError] = useK8sWatchResource<
    LocalVolumeDiscoveryResultKind[]
  >({
    groupVersionKind: {
      group: LocalVolumeDiscoveryResult.apiGroup,
      version: LocalVolumeDiscoveryResult.apiVersion,
      kind: LocalVolumeDiscoveryResult.kind,
    },
    namespace: operatorNs,
    isList: true,
    optional: true,
  });

  // Adding name property to fix issues with list page filter
  const unmemoizedDiskData =
    loaded && !loadError
      ? lvdResults
          ?.filter((result) => result.spec.nodeName === nodeName)
          ?.flatMap((disk) => disk?.status?.discoveredDevices)
          .map((disk) => ({
            ...disk,
            metadata: { name: disk.path }, // Adding name property for filtering
          }))
      : [];
  const diskData = useDeepCompareMemoize(unmemoizedDiskData, true);

  const makeLocalVolumeDiscoverRequest = React.useCallback(
    async (ns: string) => {
      const nodeNameByHostnameLabel = getLabel(obj, 'kubernetes.io/hostname');
      setProgress(true);
      try {
        await updateLocalVolumeDiscovery(
          [nodeNameByHostnameLabel],
          ns,
          setError
        );
        setProgress(false);
      } catch (error) {
        if (error?.response?.status === 404) {
          try {
            await createLocalVolumeDiscovery(
              [nodeNameByHostnameLabel],
              ns,
              setError
            );
          } catch (createError) {
            setError(createError.message);
          }
        } else {
          setError(error.message);
        }
        setProgress(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(obj)]
  );

  const EmptyMsg = React.useCallback(
    () => (
      <EmptyState variant={EmptyStateVariant.lg}>
        <p>{t('Disks Not Found')}</p>
        {csvName &&
          operatorNs &&
          !nodeRole.includes('control-plane') &&
          _.isEmpty(diskData) && (
            <Button
              isDisabled={lvdRequestInProgress}
              isLoading={lvdRequestInProgress}
              className="pf-v6-u-mt-0"
              onClick={() => makeLocalVolumeDiscoverRequest(operatorNs)}
              variant="primary"
            >
              {t('Discover Disks')}
            </Button>
          )}
      </EmptyState>
    ),
    [
      csvName,
      diskData,
      lvdRequestInProgress,
      makeLocalVolumeDiscoverRequest,
      nodeRole,
      operatorNs,
      t,
    ]
  );

  const diskFilters: RowFilter<DiskMetadata>[] = [
    {
      type: 'disk-state',
      filterGroupName: t('Disk State'),
      reducer: (disk) => disk?.status?.state,
      items: [
        { id: DiskStates.Available, title: t('Available') },
        { id: DiskStates.NotAvailable, title: t('NotAvailable') },
        { id: DiskStates.Unknown, title: t('Unknown') },
      ],
      filter: (states, disk) => {
        if (!states || !states.selected || _.isEmpty(states.selected)) {
          return true;
        }
        const diskState = disk?.status.state;
        return (
          states.selected.includes(diskState) ||
          !_.includes(states.all, diskState)
        );
      },
    },
  ];
  const [data, filteredData, onFilterChange] = useListPageFilter(
    diskData,
    diskFilters
  );
  return (
    <>
      <ListPageHeader title={t('Disks')} />
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          rowFilters={diskFilters}
          hideColumnManagement={true}
        />
        <DisksList
          data={filteredData}
          unfilteredData={data}
          loadError={lvdRequestError || subscriptionLoadError}
          loaded={subscriptionLoaded && loaded}
          EmptyMsg={EmptyMsg}
          rowData={{
            nodeName,
            operatorNs,
            csvName,
            lvdRequestInProgress,
          }}
        />
      </ListPageBody>
    </>
  );
};

export default NodesDisksListPage;
