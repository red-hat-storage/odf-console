import * as React from 'react';
import {
  useODFNamespaceSelector,
  useODFSystemFlagsSelector,
} from '@odf/core/redux';
import { getCephBlockPoolResource } from '@odf/core/resources';
import { CephBlockPoolModel, CephFileSystemModel } from '@odf/shared';
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
  TableColumn,
  TableData,
  useActiveColumns,
  WatchK8sResults,
  useListPageFilter,
  VirtualizedTable,
  useK8sWatchResources,
  WatchK8sResources,
} from '@openshift-console/dynamic-plugin-sdk';
import Status from '@openshift-console/dynamic-plugin-sdk/lib/app/components/status/Status';
import classNames from 'classnames';
import { Link, useLocation } from 'react-router-dom-v5-compat';
import { Tooltip, Label } from '@patternfly/react-core';
import { sortable, wrappable } from '@patternfly/react-table';
import {
  PoolType,
  PoolUtilizationState,
  POOL_NEAR_FULL_THRESHOLD,
  POOL_FULL_THRESHOLD,
} from '../constants';
import { StoragePoolTableData } from '../dashboards/persistent-internal/pool-utilization-card/types';
import { getPoolQuery, StorageDashboardQuery } from '../queries';
import {
  StoragePoolKind,
  CephFilesystemKind,
  StoragePool,
  PoolMetrics,
} from '../types';
import {
  disableMenuAction,
  getPerPoolMetrics,
  getScNamesUsingPool,
  isDefaultPool,
  getStoragePoolsFromFilesystem,
  getStoragePoolsFromBlockPools,
} from '../utils';
import {
  getPoolUtilizationPercentage,
  getPoolUtilizationState,
} from '../utils/pool-utilization';
import { PoolUtilizationDisplay } from './pool-utilization-display';
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
    id: 'replica',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'mirroringStatus',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-xl'),
    id: 'volumeMode',
  },
  {
    className: classNames(
      'pf-m-hidden',
      'pf-m-visible-on-2xl',
      'pf-v5-u-text-align-center'
    ),
    id: 'usedOfMaxAvailable',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'compressionStatus',
  },
  {
    className: classNames('pf-m-hidden', 'pf-m-visible-on-2xl'),
    id: 'compressionSavings',
  },
  { className: Kebab.columnClass, id: '' },
];

type StoragePoolListTableProps = {
  data: StoragePool[];
  unfilteredData: StoragePool[];
  loaded: boolean;
  loadError: any;
  rowData: any;
};

const StoragePoolListTable: React.FC<StoragePoolListTableProps> = (props) => {
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
        title: t('Replica'),
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
        title: t('Volume mode'),
        transforms: [wrappable],
        props: {
          className: tableColumnInfo[6].className,
        },
        id: tableColumnInfo[6].id,
      },
      {
        title: t('Used of max available'),
        transforms: [wrappable],
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
  poolRawCapacity: PoolMetrics;
  poolMaxAvailableCapacity: PoolMetrics;
  poolUtilization: PoolMetrics;
  poolCompressionSavings: PoolMetrics;
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
    poolMaxAvailableCapacity,
    poolUtilization,
    poolCompressionSavings,

    storageClasses,
    listPagePath,
  }: CustomData = rowData;

  const poolType = obj.type;
  const hideItems =
    poolType === PoolType.FILESYSTEM
      ? [ModalKeys.EDIT_LABELS, ModalKeys.EDIT_ANN]
      : [];
  const replica = obj.spec?.replicated?.size;
  const mirroringStatus: boolean = obj.spec?.mirroring?.enabled;
  const phase = obj?.status?.phase;

  const poolScNames: string[] = React.useMemo(
    () => getScNamesUsingPool(storageClasses, obj),
    [obj, storageClasses]
  );

  const compressionMode = obj.spec?.compressionMode;
  const isCompressionEnabled: boolean =
    !!compressionMode && compressionMode !== 'none';

  // Details page link
  const to = `${listPagePath}/${name}?namespace=${getNamespace(obj)}`;

  // https://issues.redhat.com/browse/DFBUGS-2963
  // /ns/:namespace/ocs.openshift.io~v1~StorageCluster/:systemName/storage-pools/:poolName
  // {poolRawCapacity: {"pool-1" : size_bytes, "pool-2" : size_bytes, ...}}
  const compressionSavings: string = poolCompressionSavings?.[name]
    ? humanizeBinaryBytes(poolCompressionSavings?.[name])?.string
    : '-';

  // Calculate used capacity (show used only, not "used of max available")
  const usedCapacity = poolRawCapacity?.[name]
    ? humanizeBinaryBytes(poolRawCapacity?.[name])
    : null;

  const usedCapacityDisplay = usedCapacity ? usedCapacity.string : '-';

  // Get pool utilization percentage and state
  const utilizationPercentage = getPoolUtilizationPercentage(
    poolUtilization,
    name
  );
  const utilizationInfo = getPoolUtilizationState(utilizationPercentage, t);
  const poolNeedsAttention =
    utilizationInfo.state !== PoolUtilizationState.NORMAL;

  const isCritical = utilizationPercentage >= POOL_FULL_THRESHOLD;
  const isWarning =
    utilizationPercentage >= POOL_NEAR_FULL_THRESHOLD &&
    utilizationPercentage < POOL_FULL_THRESHOLD;

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        <ResourceIcon
          resourceModel={
            poolType === PoolType.BLOCK
              ? CephBlockPoolModel
              : CephFileSystemModel
          }
        />
        {poolType === PoolType.BLOCK ? (
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
        {mirroringStatus ? t('Enabled') : t('Disabled')}
      </TableData>
      <TableData {...tableColumnInfo[6]} activeColumnIDs={activeColumnIDs}>
        <Label
          variant="filled"
          color={poolType === PoolType.BLOCK ? 'blue' : 'green'}
        >
          {poolType === PoolType.BLOCK ? t('Block') : t('Filesystem')}
        </Label>
      </TableData>
      <TableData {...tableColumnInfo[7]} activeColumnIDs={activeColumnIDs}>
        <PoolUtilizationDisplay
          pool={obj as StoragePoolTableData}
          usedCapacityDisplay={usedCapacityDisplay}
          utilizationPercentage={utilizationPercentage}
          isCritical={isCritical}
          isWarning={isWarning}
          needsAttention={poolNeedsAttention}
          totalCapacity={
            poolMaxAvailableCapacity?.[name]
              ? humanizeBinaryBytes(poolMaxAvailableCapacity[name]).string
              : '-'
          }
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
              data-test="storage-pool-kebab-button"
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
            data-test="storage-pool-kebab-button"
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

type WatchType = {
  sc: StorageClassResourceKind[];
  blockPools: StoragePoolKind[];
  filesystem: CephFilesystemKind;
};

const getResources = (
  clusterName: string,
  clusterNamespace: string
): WatchK8sResources<WatchType> => {
  return {
    sc: {
      kind: StorageClassModel.kind,
      namespaced: false,
      isList: true,
    },
    blockPools: getCephBlockPoolResource(clusterName),
    filesystem: {
      kind: referenceForModel(CephFileSystemModel),
      isList: false,
      name: `${clusterName}-cephfilesystem`,
      namespace: clusterNamespace,
    },
  };
};

const StoragePoolListPage: React.FC = () => {
  const { odfNamespace: clusterNs } = useODFNamespaceSelector();
  const { systemFlags, areFlagsLoaded, flagsLoadError } =
    useODFSystemFlagsSelector();
  const clusterName = systemFlags[clusterNs]?.ocsClusterName;

  const response = useK8sWatchResources(
    getResources(clusterName, clusterNs)
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
    <StoragePoolList
      storagePools={storagePools}
      storageClasses={memoizedSC}
      loaded={loaded}
      loadError={error}
      clusterName={clusterName}
    />
  );
};

type StoragePoolListProps = {
  storagePools: StoragePool[];
  storageClasses: StorageClassResourceKind[];
  loaded: boolean;
  loadError: any;
  clusterName: string;
};

const StoragePoolList: React.FC<StoragePoolListProps> = ({
  storagePools,
  storageClasses,
  loaded,
  loadError,
  clusterName,
}) => {
  const { t } = useCustomTranslation();

  const location = useLocation();
  const listPagePath: string = location.pathname;

  const poolNames = storagePools.map((pool) => pool.metadata?.name);

  // Todo: fix these metrics they are giving duplicate errors
  const [poolRawCapacityMetrics, rawCapLoadError, rawCapLoading] =
    useCustomPrometheusPoll(
      getValidPrometheusPollObj(
        {
          endpoint: 'api/v1/query' as any,
          query: getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_RAW_CAPACITY_USED,
            clusterName
          ),
          basePath: usePrometheusBasePath(),
        },
        !!poolNames?.length
      )
    );

  const [maxAvailableCapacityData, maxAvailableLoadError, maxAvailableLoading] =
    useCustomPrometheusPoll(
      getValidPrometheusPollObj(
        {
          endpoint: 'api/v1/query' as any,
          query: getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE,
            clusterName
          ),
          basePath: usePrometheusBasePath(),
        },
        !!poolNames?.length
      )
    );

  const [
    poolUtilizationData,
    poolUtilizationLoadError,
    poolUtilizationLoading,
  ] = useCustomPrometheusPoll(
    getValidPrometheusPollObj(
      {
        endpoint: 'api/v1/query' as any,
        query: getPoolQuery(
          poolNames,
          StorageDashboardQuery.POOL_UTILIZATION_PERCENTAGE,
          clusterName
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
            clusterName
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
    const poolMaxAvailableCapacity: PoolMetrics = getPerPoolMetrics(
      maxAvailableCapacityData,
      maxAvailableLoadError,
      maxAvailableLoading
    );
    const poolUtilization: PoolMetrics = getPerPoolMetrics(
      poolUtilizationData,
      poolUtilizationLoadError,
      poolUtilizationLoading
    );
    const poolCompressionSavings: PoolMetrics = getPerPoolMetrics(
      compressionSavings,
      compressionLoadError,
      compressionLoading
    );

    return {
      storageClasses: storageClasses ?? [],
      poolRawCapacity,
      poolMaxAvailableCapacity,
      poolUtilization,
      poolCompressionSavings,

      listPagePath,
    };
  }, [
    storageClasses,
    listPagePath,
    poolRawCapacityMetrics,
    rawCapLoadError,
    rawCapLoading,
    maxAvailableCapacityData,
    maxAvailableLoadError,
    maxAvailableLoading,
    poolUtilizationData,
    poolUtilizationLoadError,
    poolUtilizationLoading,
    compressionSavings,
    compressionLoadError,
    compressionLoading,
  ]);

  const [data, filteredData, onFilterChange] = useListPageFilter(storagePools);
  const createPath = `/odf/system/ns/${getNamespace(data[0])}/ocs.openshift.io~v1~StorageCluster/${clusterName}/storage-pools/create/~new`;

  return (
    <>
      <ListPageHeader title={t('Storage pools')}>
        {loaded && (
          <ListPageCreateLink to={createPath} data-test="item-create">
            {t('Create storage pool')}
          </ListPageCreateLink>
        )}
      </ListPageHeader>
      <ListPageBody>
        <ListPageFilter
          data={data}
          loaded={loaded}
          onFilterChange={onFilterChange}
          hideColumnManagement={true}
        />
        <StoragePoolListTable
          data={filteredData}
          unfilteredData={data}
          loaded={loaded}
          loadError={loadError}
          rowData={{ ...customData }}
        />
      </ListPageBody>
    </>
  );
};

export default StoragePoolListPage;
