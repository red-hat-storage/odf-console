import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getCephBlockPoolResource } from '@odf/core/resources';
import { CephFileSystemModel } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes, referenceForModel } from '@odf/shared/utils';
import {
  RowProps,
  TableColumn,
  TableData,
  useActiveColumns,
  VirtualizedTable,
  useK8sWatchResources,
  WatchK8sResources,
  WatchK8sResults,
} from '@openshift-console/dynamic-plugin-sdk';
import { SeverityImportantIcon } from '@patternfly/react-icons/dist/esm/icons/severity-important-icon';
import { global_danger_color_100 as dangerColor } from '@patternfly/react-tokens/dist/js/global_danger_color_100';
import { global_success_color_100 as successColor } from '@patternfly/react-tokens/dist/js/global_success_color_100';
import { global_warning_color_100 as warningColor } from '@patternfly/react-tokens/dist/js/global_warning_color_100';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Label,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';
import { sortable } from '@patternfly/react-table';
import { PoolUtilizationPopoverContent } from '../../../components/pool-utilization';
import { PoolType } from '../../../constants';
import { getPoolQuery, StorageDashboardQuery } from '../../../queries';
import {
  StoragePoolKind,
  CephFilesystemKind,
  PoolMetrics,
} from '../../../types';
import { PoolRowData } from '../../../types';
import {
  getStoragePoolsFromFilesystem,
  getStoragePoolsFromBlockPools,
  getPerPoolMetrics,
  getPoolUtilizationPercentage,
} from '../../../utils';
import {
  POOL_NEAR_FULL_THRESHOLD,
  POOL_FULL_THRESHOLD,
} from '../../../utils/pool-utilization';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';
import '../../../components/pool-utilization/pool-utilization.scss';

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'volumeMode' },
  { className: '', id: 'usage' },
];

type CustomData = {
  poolUtilization: PoolMetrics;
  poolRawCapacity: PoolMetrics;
  poolUsedCapacity: PoolMetrics;
  isFirstRow?: boolean;
};

const PoolRowRenderer: React.FC<RowProps<PoolRowData, CustomData>> = ({
  obj,
  activeColumnIDs,
}) => {
  const { t } = useCustomTranslation();

  const Icon = obj.critical ? ExclamationCircleIcon : ExclamationTriangleIcon;
  const iconColor = obj.critical ? dangerColor.value : warningColor.value;
  const poolType = obj.type;
  const volumeMode = poolType === PoolType.BLOCK ? t('Block') : t('Filesystem');

  return (
    <>
      <TableData
        {...tableColumnInfo[0]}
        activeColumnIDs={activeColumnIDs}
        className={
          (obj as any).isFirstRow
            ? 'odf-pool-utilization-card__highlighted-row'
            : ''
        }
      >
        {obj.metadata.name}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <Label
          variant="filled"
          color={poolType === PoolType.BLOCK ? 'blue' : 'green'}
        >
          {volumeMode}
        </Label>
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <Popover
          aria-label={t('Pool utilization information')}
          bodyContent={<PoolUtilizationPopoverContent pool={obj} />}
          hasAutoWidth
          triggerAction="hover"
        >
          <div className="odf-pool-utilization-card__usage">
            <Icon style={{ color: iconColor }} className="pf-v5-u-mr-sm" />
            <span>
              {obj.usedCapacity} ({obj.utilization.toFixed(1)}%)
            </span>
          </div>
        </Popover>
      </TableData>
    </>
  );
};

const getResources = (
  namespace: string,
  clusterName: string
): WatchK8sResources<{ [key: string]: any }> => ({
  blockPools: getCephBlockPoolResource(clusterName),
  filesystem: {
    kind: referenceForModel(CephFileSystemModel),
    name: `${clusterName}-cephfilesystem`,
    namespace,
    isList: false,
  },
});

export const PoolUtilizationCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { systemFlags } = useODFSystemFlagsSelector();
  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const resources = useK8sWatchResources(
    managedByOCS ? getResources(clusterNs, managedByOCS) : {}
  );
  const { blockPools, filesystem } = resources as WatchK8sResults<{
    blockPools: StoragePoolKind[];
    filesystem: CephFilesystemKind;
  }>;

  const allPools = React.useMemo(() => {
    if (!managedByOCS) {
      return [];
    }

    const poolsFromBlock =
      blockPools?.loaded && !blockPools?.loadError
        ? getStoragePoolsFromBlockPools(blockPools.data)
        : [];
    const poolsFromFS =
      filesystem?.loaded && !filesystem?.loadError && filesystem?.data
        ? getStoragePoolsFromFilesystem(filesystem.data)
        : [];

    return [...poolsFromBlock, ...poolsFromFS];
  }, [blockPools, filesystem, managedByOCS]);

  const poolNames = React.useMemo(() => {
    return allPools.map((pool) => pool.metadata.name);
  }, [allPools]);

  const [utilizationData, utilizationLoading, utilizationLoadError] =
    useCustomPrometheusPoll({
      query: poolNames?.length
        ? getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_UTILIZATION_PERCENTAGE,
            managedByOCS
          )
        : '',
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [capacityData, capacityLoading, capacityLoadError] =
    useCustomPrometheusPoll({
      query: poolNames?.length
        ? getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE,
            managedByOCS
          )
        : '',
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [usedCapacityData, usedCapacityLoading, usedCapacityLoadError] =
    useCustomPrometheusPoll({
      query: poolNames?.length
        ? getPoolQuery(
            poolNames,
            StorageDashboardQuery.POOL_RAW_CAPACITY_USED,
            managedByOCS
          )
        : '',
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const poolUtilization = getPerPoolMetrics(
    utilizationData,
    utilizationLoadError,
    utilizationLoading
  );

  const poolCapacity = getPerPoolMetrics(
    capacityData,
    capacityLoadError,
    capacityLoading
  );

  const poolUsedCapacity = getPerPoolMetrics(
    usedCapacityData,
    usedCapacityLoadError,
    usedCapacityLoading
  );

  const poolsData: PoolRowData[] = React.useMemo(() => {
    if (!allPools.length || !poolUtilization) return [];

    return allPools.map((pool) => {
      const poolName = pool.metadata.name;
      const utilization = getPoolUtilizationPercentage(
        poolUtilization,
        poolName
      );
      const totalCapacityBytes = poolCapacity?.[poolName] || 0;
      const usedCapacityBytes = poolUsedCapacity?.[poolName] || 0;

      return {
        ...pool,
        utilization,
        usedCapacity: humanizeBinaryBytes(usedCapacityBytes).string,
        totalCapacity: humanizeBinaryBytes(totalCapacityBytes).string,
        critical: utilization >= POOL_FULL_THRESHOLD,
        warning:
          utilization >= POOL_NEAR_FULL_THRESHOLD &&
          utilization < POOL_FULL_THRESHOLD,
      };
    });
  }, [allPools, poolUtilization, poolCapacity, poolUsedCapacity]);

  const poolsNeedingAttention = React.useMemo(() => {
    return poolsData
      .filter((pool) => pool.critical || pool.warning)
      .sort((a, b) => b.utilization - a.utilization)
      .map((pool, index) => ({
        ...pool,
        isFirstRow: index === 0,
      }));
  }, [poolsData]);

  const loading =
    !blockPools?.loaded ||
    !filesystem?.loaded ||
    utilizationLoading ||
    capacityLoading ||
    usedCapacityLoading;
  const error =
    blockPools?.loadError ||
    filesystem?.loadError ||
    utilizationLoadError ||
    capacityLoadError ||
    usedCapacityLoadError;

  const tableColumns = React.useMemo<TableColumn<PoolRowData>[]>(
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
        title: t('Volume mode'),
        props: {
          className: tableColumnInfo[1].className,
        },
        id: tableColumnInfo[1].id,
      },
      {
        title: t('Used of max available'),
        props: {
          className: tableColumnInfo[2].className,
        },
        id: tableColumnInfo[2].id,
      },
    ],
    [t]
  );

  const [columns] = useActiveColumns({
    columns: tableColumns,
    showNamespaceOverride: false,
    columnManagementID: null,
  });

  const customData: CustomData = React.useMemo(
    () => ({
      poolUtilization,
      poolRawCapacity: poolCapacity,
      poolUsedCapacity,
    }),
    [poolUtilization, poolCapacity, poolUsedCapacity]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Storage pool utilization')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!loading && !error && poolsNeedingAttention.length > 0 && (
          <>
            <div className="odf-pool-utilization-card__alert">
              <SeverityImportantIcon className="odf-pool-utilization-card__alert-icon" />
              <span className="odf-pool-utilization-card__alert-count">
                {poolsNeedingAttention.length}
              </span>
              <span>{t('needs attention')}</span>
            </div>
            <p className="odf-pool-utilization-card__description">
              {t(
                'Pools with usage over 90% may require immediate action to prevent issues.'
              )}
            </p>
            <VirtualizedTable
              aria-label={t('Storage pools needing attention')}
              columns={columns}
              Row={PoolRowRenderer}
              data={poolsNeedingAttention}
              unfilteredData={poolsNeedingAttention}
              loaded={true}
              loadError={null}
              rowData={customData}
            />
          </>
        )}
        {loading && (
          <div className="odf-pool-utilization-card__loading">
            <Skeleton
              height="40%"
              screenreaderText={t('Loading pool utilization...')}
            />
          </div>
        )}
        {!loading && error && (
          <div className="odf-pool-utilization-card__error">
            {t('Error loading pool utilization data')}
          </div>
        )}
        {!loading && !error && poolsNeedingAttention.length === 0 && (
          <div className="odf-pool-utilization-card__healthy-state">
            <CheckCircleIcon
              className="odf-pool-utilization-card__healthy-icon"
              style={{ color: successColor.value, fontSize: '3rem' }}
            />
            <p className="odf-pool-utilization-card__healthy-message">
              {t('Utilization is good!')}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default PoolUtilizationCard;
