import * as React from 'react';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import {
  LaunchModal,
  ModalKeys,
  useModalLauncher,
} from '@odf/shared/modals/modalLauncher';
import { StorageClassModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import {
  K8sResourceKind,
  StorageClassResourceKind,
  CephClusterKind,
} from '@odf/shared/types';
import { humanizeBinaryBytes, referenceForModel } from '@odf/shared/utils';
import {
  ListPageBody,
  ListPageCreateLink,
  ListPageFilter,
  ListPageHeader,
  RowProps,
  StatusIconAndText,
  TableColumn,
  TableData,
  useActiveColumns,
  useK8sWatchResources,
  useListPageFilter,
  VirtualizedTable,
} from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip } from '@patternfly/react-core';
import { sortable, wrappable } from '@patternfly/react-table';
import { CEPH_NS, COMPRESSION_ON } from '../constants';
import { CephBlockPoolModel, CephClusterModel } from '../models';
import { getPoolQuery, StorageDashboardQuery } from '../queries';
import { StoragePoolKind } from '../types';
import {
  disableMenuAction,
  getPerPoolMetrics,
  getScNamesUsingPool,
  twelveHoursdateTimeNoYear,
} from '../utils';
import { PopoverHelper } from './popover-helper';

const tableColumnInfo = [
  { className: 'pf-u-w-16-on-2xl', id: 'name' },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-md',
      'pf-u-w-8-on-2xl'
    ),
    id: 'status',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-lg'),
    id: 'storageClasses',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-lg',
      'pf-u-w-8-on-2xl'
    ),
    id: 'replicas',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'usedCapacity',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'mirroringStatus',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'overallImageHealth',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'compressionStatus',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'compressionSavings',
  },
  { className: 'dropdown-kebab-pf pf-c-table__action', id: '' },
];

type BlockPoolListProps = {
  data: K8sResourceKind[];
  unfilteredData: K8sResourceKind[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const customActionsMap = {
  [ModalKeys.DELETE]: React.lazy(
    () => import('../modals/block-pool/delete-block-pool-modal')
  ),
  [ModalKeys.EDIT_RES]: React.lazy(
    () => import('../modals/block-pool/update-block-pool-modal')
  ),
};

const BlockPoolList: React.FC<BlockPoolListProps> = (props) => {
  const { t } = useTranslation();
  const tableColumns = React.useMemo<TableColumn<any>[]>(
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
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('StorageClasses'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
      {
        title: t('Replicas'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('Used capacity'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
      {
        title: t('Mirroring status'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[5].className,
        },
        id: tableColumnInfo[5].id,
      },
      {
        title: t('Overall image health'),
        props: {
          className: tableColumnInfo[6].className,
        },
        id: tableColumnInfo[6].id,
      },
      {
        title: t('Compression status'),
        props: {
          className: tableColumnInfo[7].className,
        },
        id: tableColumnInfo[7].id,
      },
      {
        title: t('Compression savings'),
        props: {
          className: tableColumnInfo[8].className,
        },
        id: tableColumnInfo[8].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[9].className,
        },
        id: tableColumnInfo[9].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: tableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  return (
    <VirtualizedTable
      aria-label={t('BlockPools')}
      columns={columns}
      Row={RowRenderer}
      {...props}
    />
  );
};

type CustomData = {
  poolRawCapacity: {
    [poolName: string]: string | number;
  };
  poolCompressionSavings: {
    [poolName: string]: string | number;
  };
  storageClasses: StorageClassResourceKind[];
  listPagePath: string;
  launchModal: LaunchModal;
  cephCluster: CephClusterKind;
};

const RowRenderer: React.FC<RowProps<StoragePoolKind, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useTranslation();

  const {
    poolRawCapacity,
    poolCompressionSavings,
    storageClasses,
    listPagePath,
    cephCluster,
    launchModal,
  } = rowData;

  const { name } = obj.metadata;
  const replica = obj.spec?.replicated?.size;
  const mirroringStatus: boolean = obj.spec?.mirroring?.enabled;
  const mirroringImageHealth: string = mirroringStatus
    ? obj.status?.mirroringStatus?.summary?.image_health
    : '-';
  const lastChecked: string = obj.status?.mirroringStatus?.lastChecked;
  const formatedDateTime = lastChecked
    ? twelveHoursdateTimeNoYear.format(new Date(lastChecked))
    : '-';
  const compressionStatus: boolean =
    obj.spec?.compressionMode === COMPRESSION_ON;
  const phase = obj?.status?.phase;

  // Hooks
  const poolScNames: string[] = React.useMemo(
    () => getScNamesUsingPool(storageClasses, name),
    [name, storageClasses]
  );

  // Details page link
  const to = `${listPagePath}/${name}`;

  // Metrics
  // {poolRawCapacity: {"pool-1" : size_bytes, "pool-2" : size_bytes, ...}}
  const rawCapacity: string = poolRawCapacity?.[name]
    ? humanizeBinaryBytes(poolRawCapacity?.[name])?.string
    : '-';
  const compressionSavings: string = poolCompressionSavings?.[name]
    ? humanizeBinaryBytes(poolCompressionSavings?.[name])?.string
    : '-';

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceIcon resourceModel={CephBlockPoolModel} />
        <Link
          to={to}
          className="co-resource-item__resource-name"
          data-test={name}
        >
          {name}
        </Link>
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <Status status={phase} />
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <PopoverHelper
          names={poolScNames}
          text="StorageClasses"
          kind={StorageClassModel}
        />
      </TableData>
      <TableData {...tableColumnInfo[3]} activeColumnIDs={activeColumnIDs}>
        {replica}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        {rawCapacity}
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        {mirroringStatus ? t('Enabled') : t('Disabled')}
      </TableData>
      <TableData {...tableColumnInfo[6]} activeColumnIDs={activeColumnIDs}>
        <Tooltip content={`${t('Last synced')} ${formatedDateTime}`}>
          <StatusIconAndText
            title={mirroringImageHealth}
            icon={healthStateMapping[mirroringImageHealth]?.icon}
          />
        </Tooltip>
      </TableData>
      <TableData {...tableColumnInfo[7]} activeColumnIDs={activeColumnIDs}>
        {compressionStatus ? t('Enabled') : t('Disabled')}
      </TableData>
      <TableData {...tableColumnInfo[8]} activeColumnIDs={activeColumnIDs}>
        {compressionStatus ? compressionSavings : '-'}
      </TableData>
      <TableData {...tableColumnInfo[9]} activeColumnIDs={activeColumnIDs}>
        <Kebab
          launchModal={launchModal}
          extraProps={{ resource: obj, resourceModel: CephBlockPoolModel }}
          isDisabled={disableMenuAction(obj, cephCluster)}
          customKebabItems={(t) => ({
            [ModalKeys.EDIT_RES]: t('Edit resource'),
            [ModalKeys.DELETE]: t('Delete'),
          })}
        />
      </TableData>
    </>
  );
};

type BlockPoolListPageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: any;
  hideLabelFilter?: boolean;
  hideNameLabelFilters?: boolean;
  hideColumnManagement?: boolean;
};

const resources = {
  ceph: {
    kind: referenceForModel(CephClusterModel),
    namespaced: true,
    namespace: CEPH_NS,
    isList: true,
  },
  sc: {
    kind: StorageClassModel.kind,
    namespaced: false,
    isList: true,
  },
  blockPools: {
    kind: referenceForModel(CephBlockPoolModel),
    isList: true,
  },
};

type WatchType = {
  sc: StorageClassResourceKind[];
  ceph: K8sResourceKind[];
  blockPools: StoragePoolKind[];
};

type PoolMetrics = {
  [poolName: string]: string;
};

export const BlockPoolListPage: React.FC<BlockPoolListPageProps> = ({}) => {
  const { t } = useTranslation();

  const location = useLocation();
  const listPagePath: string = location.pathname;

  const [ModalComponent, props, launchModal] = useModalLauncher(
    customActionsMap as any
  );
  const response = useK8sWatchResources<WatchType>(resources);

  const cephClusters = response.ceph.data;
  const cephLoaded = response.ceph.loaded;
  const cephError = response.ceph.loadError;

  const storageClasses = response.sc.data;
  const scLoaded = response.sc.loaded;
  const scError = response.sc.loadError;

  const blockPools = response.blockPools.data;
  const blockPoolsLoaded = response.blockPools.loaded;
  const blockPoolsError = response.blockPools.loadError;

  const memoizedSC: StorageClassResourceKind[] = useDeepCompareMemoize(
    storageClasses,
    true
  );
  const poolNames: string[] = blockPools.map((pool) => pool.metadata?.name);
  const memoizedPoolNames = useDeepCompareMemoize(poolNames, true);

  // Metrics
  const [poolRawCapacityMetrics, rawCapLoadError, rawCapLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: getPoolQuery(
        memoizedPoolNames,
        StorageDashboardQuery.POOL_RAW_CAPACITY_USED
      ),
      namespace: CEPH_NS,
      basePath: usePrometheusBasePath(),
    });

  // compression queries
  const [compressionSavings, compressionLoadError, compressionLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: getPoolQuery(
        poolNames,
        StorageDashboardQuery.POOL_COMPRESSION_SAVINGS
      ),
      namespace: CEPH_NS,
      basePath: usePrometheusBasePath(),
    });

  const customData = React.useMemo(() => {
    const poolRawCapacity: PoolMetrics = getPerPoolMetrics(
      poolRawCapacityMetrics,
      rawCapLoadError,
      rawCapLoading
    );
    const poolCompressionSavings: PoolMetrics = getPerPoolMetrics(
      compressionSavings,
      compressionLoadError,
      compressionLoading
    );
    return {
      storageClasses: memoizedSC ?? [],
      cephCluster: cephClusters?.[0],
      poolRawCapacity,
      poolCompressionSavings,
      listPagePath,
    };
  }, [
    cephClusters,
    compressionLoadError,
    compressionLoading,
    compressionSavings,
    memoizedSC,
    poolRawCapacityMetrics,
    rawCapLoadError,
    rawCapLoading,
    listPagePath,
  ]);

  const loaded =
    cephLoaded ||
    scLoaded ||
    blockPoolsLoaded ||
    !compressionLoading ||
    !rawCapLoading;
  const error =
    cephError ||
    scError ||
    blockPoolsError ||
    compressionLoadError ||
    rawCapLoadError;

  const [data, filteredData, onFilterChange] = useListPageFilter(blockPools);

  const createPath = `${listPagePath}/create/~new`;
  return (
    <>
      <ModalComponent {...props} />
      <ListPageHeader title={t('BlockPools')}>
        <ListPageCreateLink to={createPath}>
          {t('Create BlockPool')}
        </ListPageCreateLink>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <BlockPoolList
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={error}
          rowData={{ ...customData, launchModal }}
        />
      </ListPageBody>
    </>
  );
};
