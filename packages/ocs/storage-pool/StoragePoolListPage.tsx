import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { cephBlockPoolResource } from '@odf/core/resources';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { Kebab } from '@odf/shared/kebab/kebab';
import { ModalKeys } from '@odf/shared/modals/types';
import { StorageClassModel } from '@odf/shared/models';
import { ResourceIcon } from '@odf/shared/resource-link/resource-link';
import { getNamespace } from '@odf/shared/selectors';
import { StorageClassResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  referenceForModel,
  getValidPrometheusPollObj,
} from '@odf/shared/utils';
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
  WatchK8sResults,
  useListPageFilter,
  VirtualizedTable,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import { Link, useLocation, useParams } from 'react-router-dom-v5-compat';
import { Tooltip } from '@patternfly/react-core';
import { sortable, wrappable } from '@patternfly/react-table';
import { POOL_TYPE } from '../constants';
import {
  MirroringImageHealthMap,
  healthStateMessage,
} from '../dashboards/block-pool/states';
import { CephBlockPoolModel, CephFileSystemModel } from '../models';
import { getPoolQuery, StorageDashboardQuery } from '../queries';
import {
  StoragePoolKind,
  ODFSystemParams,
  CephFilesystemKind,
  StoragePool,
} from '../types';
import {
  disableMenuAction,
  getPerPoolMetrics,
  getScNamesUsingPool,
  isDefaultPool,
  PoolMetrics,
  getStoragePoolsFromFilesystem,
  getStoragePoolsFromBlockPools,
} from '../utils';
import { PopoverHelper } from './popover-helper';

const tableColumnInfo = [
  { className: 'pf-v5-u-w-16-on-2xl', id: 'name' },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-md',
      'pf-v5-u-w-8-on-2xl'
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
      'pf-v5-u-w-8-on-2xl'
    ),
    id: 'volumeType',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-lg',
      'pf-v5-u-w-8-on-2xl'
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
  { className: Kebab.columnClass, id: '' },
];

type StoragePoolListProps = {
  data: StoragePool[];
  unfilteredData: StoragePool[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const StoragePoolList: React.FC<StoragePoolListProps> = (props) => {
  const { t } = useCustomTranslation();
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
        title: t('Volume type'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[3].className,
        },
        id: tableColumnInfo[3].id,
      },
      {
        title: t('Replicas'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[4].className,
        },
        id: tableColumnInfo[4].id,
      },
      {
        title: t('Used capacity'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[5].className,
        },
        id: tableColumnInfo[5].id,
      },
      {
        title: t('Mirroring status'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[6].className,
        },
        id: tableColumnInfo[6].id,
      },
      {
        title: t('Overall image health'),
        props: {
          className: tableColumnInfo[7].className,
        },
        id: tableColumnInfo[7].id,
      },
      {
        title: t('Compression status'),
        props: {
          className: tableColumnInfo[8].className,
        },
        id: tableColumnInfo[8].id,
      },
      {
        title: t('Compression savings'),
        props: {
          className: tableColumnInfo[9].className,
        },
        id: tableColumnInfo[9].id,
      },
      {
        title: '',
        props: {
          className: tableColumnInfo[10].className,
        },
        id: tableColumnInfo[10].id,
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
      aria-label={t('Storage pools')}
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
  poolMirroringImageHealth: {
    [poolName: string]: string | number;
  };
  storageClasses: StorageClassResourceKind[];
  listPagePath: string;
};

const RowRenderer: React.FC<RowProps<StoragePool, CustomData>> = ({
  obj,
  activeColumnIDs,
  rowData,
}) => {
  const { t } = useCustomTranslation();
  const { name } = obj.metadata;
  const { systemFlags } = useODFSystemFlagsSelector();
  const isExternalStorageSystem =
    systemFlags[getNamespace(obj)]?.isExternalMode;

  const {
    poolRawCapacity,
    poolCompressionSavings,
    storageClasses,
    listPagePath,
    poolMirroringImageHealth,
  }: CustomData = rowData;

  const poolType = obj.type;
  const hideItems =
    poolType === POOL_TYPE.FILESYSTEM
      ? [ModalKeys.EDIT_LABELS, ModalKeys.EDIT_ANN]
      : [];
  const replica = obj.spec?.replicated?.size;
  const mirroringStatus: boolean = obj.spec?.mirroring?.enabled;
  const imageHealth =
    healthStateMapping?.[
      MirroringImageHealthMap?.[poolMirroringImageHealth?.[name]]
    ];
  const compressionMode = obj.spec?.compressionMode;
  const isCompressionEnabled: boolean =
    !!compressionMode && compressionMode !== 'none';
  const phase = obj?.status?.phase;

  const poolScNames: string[] = React.useMemo(
    () => getScNamesUsingPool(storageClasses, obj),
    [obj, storageClasses]
  );

  // Details page link
  const to = `${listPagePath}/${name}`;

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
        <ResourceIcon
          resourceModel={
            poolType === POOL_TYPE.BLOCK
              ? CephBlockPoolModel
              : CephFileSystemModel
          }
        />
        {poolType === POOL_TYPE.BLOCK ? (
          <Link
            to={to}
            className="co-resource-item__resource-name"
            data-test={name}
          >
            {name}
          </Link>
        ) : (
          name
        )}
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
        {poolType}
      </TableData>
      <TableData {...tableColumnInfo[4]} activeColumnIDs={activeColumnIDs}>
        <span data-test={`${name}-replicas`}>{replica}</span>
      </TableData>
      <TableData {...tableColumnInfo[5]} activeColumnIDs={activeColumnIDs}>
        {rawCapacity}
      </TableData>
      <TableData {...tableColumnInfo[6]} activeColumnIDs={activeColumnIDs}>
        {mirroringStatus ? t('Enabled') : t('Disabled')}
      </TableData>
      <TableData {...tableColumnInfo[7]} activeColumnIDs={activeColumnIDs}>
        <StatusIconAndText
          title={healthStateMessage(imageHealth?.health, t)}
          icon={imageHealth?.icon}
        />
      </TableData>
      <TableData {...tableColumnInfo[8]} activeColumnIDs={activeColumnIDs}>
        <span data-test={`${name}-compression`}>
          {isCompressionEnabled ? t('Enabled') : t('Disabled')}
        </span>
      </TableData>
      <TableData {...tableColumnInfo[9]} activeColumnIDs={activeColumnIDs}>
        {isCompressionEnabled ? compressionSavings : '-'}
      </TableData>
      <TableData {...tableColumnInfo[10]} activeColumnIDs={activeColumnIDs}>
        {isDefaultPool(obj) ? (
          <Tooltip
            content={t('Default pool cannot be deleted.')}
            trigger={'mouseenter'}
          >
            <Kebab
              extraProps={{ resource: obj, resourceModel: CephBlockPoolModel }}
              isDisabled={disableMenuAction(obj, isExternalStorageSystem)}
              customKebabItems={[
                {
                  key: ModalKeys.EDIT_RES,
                  value: t('Edit Pool'),
                  component: React.lazy(
                    () =>
                      import('../modals/storage-pool/update-storage-pool-modal')
                  ),
                },
                {
                  key: ModalKeys.DELETE,
                  value: t('Delete Pool'),
                  component: React.lazy(
                    () =>
                      import('../modals/storage-pool/delete-storage-pool-modal')
                  ),
                },
              ]}
              hideItems={hideItems}
            />
          </Tooltip>
        ) : (
          <Kebab
            extraProps={{ resource: obj, resourceModel: CephBlockPoolModel }}
            isDisabled={disableMenuAction(obj, isExternalStorageSystem)}
            customKebabItems={[
              {
                key: ModalKeys.EDIT_RES,
                value: t('Edit Pool'),
                component: React.lazy(
                  () =>
                    import('../modals/storage-pool/update-storage-pool-modal')
                ),
              },
              {
                key: ModalKeys.DELETE,
                value: t('Delete Pool'),
                component: React.lazy(
                  () =>
                    import('../modals/storage-pool/delete-storage-pool-modal')
                ),
              },
            ]}
            hideItems={hideItems}
          />
        )}
      </TableData>
    </>
  );
};

type StoragePoolListPageProps = {
  storagePools: StoragePool[];
  storageClasses: StorageClassResourceKind[];
  loaded: boolean;
  loadError: any;
  managedByOCS: string;
};

const resources = {
  sc: {
    kind: StorageClassModel.kind,
    namespaced: false,
    isList: true,
  },
  blockPools: cephBlockPoolResource,
  filesystem: {
    kind: referenceForModel(CephFileSystemModel),
    isList: false,
  },
};

type WatchType = {
  sc: StorageClassResourceKind[];
  blockPools: StoragePoolKind[];
  filesystem: CephFilesystemKind;
};

// To divide the number of hooks, add _StoragePoolListPage on top of StoragePoolListPage.
const _StoragePoolListPage: React.FC = () => {
  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  resources.filesystem['name'] = `${managedByOCS}-cephfilesystem`;
  resources.filesystem['namespace'] = clusterNs;

  const response = useK8sWatchResources(
    resources
  ) as WatchK8sResults<WatchType>;

  const storageClasses = response.sc.data;
  const scLoaded = response.sc.loaded;
  const scError = response.sc.loadError;

  const blockPools = response.blockPools.data;
  const blockPoolsLoaded = response.blockPools.loaded;
  const blockPoolsError = response.blockPools.loadError;

  const filesystem = response.filesystem.data;
  const filesystemLoaded = response.filesystem.loaded;
  const filesystemError = response.filesystem.loadError;

  const memoizedSC: StorageClassResourceKind[] = useDeepCompareMemoize(
    storageClasses,
    true
  );

  const poolsFromBlock = getStoragePoolsFromBlockPools(blockPools);
  const poolsFromFS = getStoragePoolsFromFilesystem(filesystem);
  const storagePools =
    poolsFromBlock && poolsFromFS ? poolsFromBlock.concat(poolsFromFS) : [];

  const loaded =
    blockPoolsLoaded && filesystemLoaded && (areFlagsLoaded || scLoaded);

  const error = flagsLoadError || scError || blockPoolsError || filesystemError;

  return (
    <StoragePoolListPage
      storagePools={storagePools}
      storageClasses={memoizedSC}
      loaded={loaded}
      loadError={error}
      managedByOCS={managedByOCS}
    />
  );
};

const StoragePoolListPage: React.FC<StoragePoolListPageProps> = ({
  storagePools,
  storageClasses,
  loaded,
  loadError,
  managedByOCS,
}) => {
  const { t } = useCustomTranslation();

  const location = useLocation();
  const listPagePath: string = location.pathname;

  const poolNames = storagePools.map((pool) => pool.metadata?.name);

  const [poolRawCapacityMetrics, rawCapLoadError, rawCapLoading] =
    useCustomPrometheusPoll(
      getValidPrometheusPollObj(
        {
          endpoint: 'api/v1/query' as any,
          query: getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_RAW_CAPACITY_USED,
            managedByOCS
          ),
          basePath: usePrometheusBasePath(),
        },
        !!poolNames?.length
      )
    );

  const [compressionSavings, compressionLoadError, compressionLoading] =
    useCustomPrometheusPoll(
      getValidPrometheusPollObj(
        {
          endpoint: 'api/v1/query' as any,
          query: getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_COMPRESSION_SAVINGS,
            managedByOCS
          ),
          basePath: usePrometheusBasePath(),
        },
        !!poolNames?.length
      )
    );

  const [
    poolMirroringImageMetrics,
    poolMirroringImageLoadError,
    poolMirroringImageLoading,
  ] = useCustomPrometheusPoll(
    getValidPrometheusPollObj(
      {
        endpoint: 'api/v1/query' as any,
        query: getPoolQuery(
          poolNames,
          StorageDashboardQuery.POOL_MIRRORING_IMAGE_HEALTH,
          managedByOCS
        ),
        basePath: usePrometheusBasePath(),
      },
      !!poolNames?.length
    )
  );

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
    const poolMirroringImageHealth: PoolMetrics = getPerPoolMetrics(
      poolMirroringImageMetrics,
      poolMirroringImageLoadError,
      poolMirroringImageLoading
    );
    return {
      storageClasses: storageClasses ?? [],
      poolRawCapacity,
      poolCompressionSavings,
      listPagePath,
      poolMirroringImageHealth,
    };
  }, [
    compressionLoadError,
    compressionLoading,
    compressionSavings,
    storageClasses,
    poolRawCapacityMetrics,
    rawCapLoadError,
    rawCapLoading,
    listPagePath,
    poolMirroringImageMetrics,
    poolMirroringImageLoadError,
    poolMirroringImageLoading,
  ]);

  const error = loadError || compressionLoadError || rawCapLoadError;

  const [data, filteredData, onFilterChange] = useListPageFilter(storagePools);

  const createPath = `${listPagePath}/create/~new`;
  return (
    <>
      <ListPageHeader title={t('Storage pools')}>
        <ListPageCreateLink to={createPath}>
          {t('Create storage pool')}
        </ListPageCreateLink>
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <StoragePoolList
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={error}
          rowData={{ ...customData }}
        />
      </ListPageBody>
    </>
  );
};

export default _StoragePoolListPage;
