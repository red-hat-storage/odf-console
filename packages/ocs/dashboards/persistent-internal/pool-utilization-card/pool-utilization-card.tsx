import * as React from 'react';
import { useGetInternalClusterDetails } from '@odf/core/redux/utils';
import { getCephBlockPoolResource } from '@odf/core/resources';
import { CephFileSystemModel } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { getName } from '@odf/shared/selectors';
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
import * as _ from 'lodash-es';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Flex,
  Label,
  Popover,
  Skeleton,
} from '@patternfly/react-core';
import { SeverityImportantIcon } from '@patternfly/react-icons';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@patternfly/react-icons';
import { sortable } from '@patternfly/react-table';
import { t_global_color_status_warning_default as warningColor } from '@patternfly/react-tokens';
import { t_global_color_status_success_default as successColor } from '@patternfly/react-tokens';
import { t_global_color_status_danger_default as dangerColor } from '@patternfly/react-tokens';
import { PoolType } from '../../../constants';
import {
  POOL_NEAR_FULL_THRESHOLD,
  POOL_FULL_THRESHOLD,
} from '../../../constants';
import { getPoolQuery, StorageDashboardQuery } from '../../../queries';
import {
  StoragePoolKind,
  CephFilesystemKind,
  PoolMetrics,
} from '../../../types';
import {
  getPerPoolMetrics,
  getPoolUtilizationPercentage,
  getStoragePoolsFromBlockPools,
  getStoragePoolsFromFilesystem,
} from '../../../utils';
import { PoolUtilizationPopoverContent } from './PoolUtilizationPopoverContent';
import { StoragePoolTableData } from './types';

const tableColumnInfo = [
  { className: '', id: 'name' },
  { className: '', id: 'volumeType' },
  { className: '', id: 'usage' },
];

type CustomData = {
  poolUtilization: PoolMetrics;
  poolRawCapacity: PoolMetrics;
  poolUsedCapacity: PoolMetrics;
};

const PoolRowRenderer: React.FC<RowProps<StoragePoolTableData, CustomData>> = ({
  obj,
  activeColumnIDs,
}) => {
  const { t } = useCustomTranslation();

  const Icon = obj.critical ? ExclamationCircleIcon : ExclamationTriangleIcon;
  const iconColor = obj.critical ? dangerColor.value : warningColor.value;
  const poolType = obj.type;
  const volumeType = poolType === PoolType.BLOCK ? t('Block') : t('Filesystem');

  return (
    <>
      <TableData {...tableColumnInfo[0]} activeColumnIDs={activeColumnIDs}>
        {getName(obj)}
      </TableData>
      <TableData {...tableColumnInfo[1]} activeColumnIDs={activeColumnIDs}>
        <Label
          variant="filled"
          color={poolType === PoolType.BLOCK ? 'blue' : 'green'}
        >
          {volumeType}
        </Label>
      </TableData>
      <TableData {...tableColumnInfo[2]} activeColumnIDs={activeColumnIDs}>
        <Popover
          aria-label={t('Pool utilization information')}
          bodyContent={<PoolUtilizationPopoverContent pool={obj} />}
          hasAutoWidth
          triggerAction="hover"
        >
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            className="pf-v6-u-cursor-pointer"
          >
            <Icon style={{ color: iconColor }} />
            <span>
              {obj.usedCapacity} ({obj.utilization.toFixed(1)}%)
            </span>
          </Flex>
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

  const { clusterNamespace: clusterNs, clusterName: ocsClusterName } =
    useGetInternalClusterDetails();

  const resources = useK8sWatchResources(
    ocsClusterName ? getResources(clusterNs, ocsClusterName) : {}
  );
  const { blockPools, filesystem } = resources as WatchK8sResults<{
    blockPools: StoragePoolKind[];
    filesystem: CephFilesystemKind;
  }>;

  const { allPools, poolNames } = React.useMemo(() => {
    if (!ocsClusterName) {
      return { allPools: [], poolNames: [] };
    }

    const poolsFromBlock =
      blockPools?.loaded && !blockPools?.loadError
        ? getStoragePoolsFromBlockPools(blockPools.data)
        : [];
    const poolsFromFS =
      filesystem?.loaded && !filesystem?.loadError && filesystem?.data
        ? getStoragePoolsFromFilesystem(filesystem.data)
        : [];

    const pools = [...poolsFromBlock, ...poolsFromFS];
    return {
      allPools: pools,
      poolNames: pools.map((pool) => getName(pool)),
    };
  }, [blockPools, filesystem, ocsClusterName]);

  const utilizationQuery = poolNames?.length
    ? getPoolQuery(
        poolNames,
        StorageDashboardQuery.POOL_UTILIZATION_PERCENTAGE,
        ocsClusterName
      )
    : '';

  const [poolUtilizationData, poolMetricsError, poolMetricsLoaded] =
    useCustomPrometheusPoll({
      query: utilizationQuery,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const capacityQuery = poolNames?.length
    ? getPoolQuery(
        poolNames,
        StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE,
        ocsClusterName
      )
    : '';

  const [poolCapacityData, poolCapacityError, poolCapacityLoaded] =
    useCustomPrometheusPoll({
      query: capacityQuery,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const usedCapacityQuery = poolNames?.length
    ? getPoolQuery(
        poolNames,
        StorageDashboardQuery.POOL_RAW_CAPACITY_USED,
        ocsClusterName
      )
    : '';

  const [poolUsedCapacityData, poolUsedCapacityError, poolUsedCapacityLoaded] =
    useCustomPrometheusPoll({
      query: usedCapacityQuery,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const poolUtilizationMetrics = getPerPoolMetrics(
    poolUtilizationData,
    poolMetricsError,
    poolMetricsLoaded
  );

  const poolCapacityMetrics = getPerPoolMetrics(
    poolCapacityData,
    poolCapacityError,
    poolCapacityLoaded
  );

  const poolUsedCapacityMetrics = getPerPoolMetrics(
    poolUsedCapacityData,
    poolUsedCapacityError,
    poolUsedCapacityLoaded
  );

  const resourcesLoaded = blockPools?.loaded && filesystem?.loaded;
  const resourcesError = blockPools?.loadError || filesystem?.loadError;

  const poolsNeedingAttention = React.useMemo(() => {
    if (!allPools.length) {
      return [];
    }

    const data = allPools.map((pool) => {
      const poolName = getName(pool);
      const utilization = getPoolUtilizationPercentage(
        poolUtilizationMetrics,
        poolName
      );
      const totalCapacityBytes = poolCapacityMetrics?.[poolName] || 0;
      const usedCapacityBytes = poolUsedCapacityMetrics?.[poolName] || 0;

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

    const needingAttention = data
      .filter((pool) => pool.critical || pool.warning)
      .sort((a, b) => b.utilization - a.utilization);

    return needingAttention;
  }, [
    allPools,
    poolUtilizationMetrics,
    poolCapacityMetrics,
    poolUsedCapacityMetrics,
  ]);

  const metricsLoaded =
    !poolMetricsLoaded && !poolCapacityLoaded && !poolUsedCapacityLoaded;
  const metricsError =
    poolMetricsError || poolCapacityError || poolUsedCapacityError;

  const loading = !resourcesLoaded || !metricsLoaded;
  const error = resourcesError || metricsError;

  const tableColumns = React.useMemo<TableColumn<StoragePoolTableData>[]>(
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
        title: t('Volume type'),
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
      poolUtilization: poolUtilizationMetrics,
      poolRawCapacity: poolCapacityMetrics,
      poolUsedCapacity: poolUsedCapacityMetrics,
    }),
    [poolUtilizationMetrics, poolCapacityMetrics, poolUsedCapacityMetrics]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Storage pool utilization')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!loading && !error && poolsNeedingAttention.length > 0 && (
          <>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
              className="pf-v6-u-mb-sm"
            >
              <SeverityImportantIcon className="pf-v6-u-warning-color-100 pf-v6-u-font-size-lg" />
              <span className="pf-v6-u-font-size-2xl pf-v6-u-font-weight-bold pf-v6-u-warning-color-100">
                {poolsNeedingAttention.length}
              </span>
              <span>{t('needs attention')}</span>
            </Flex>
            <p className="pf-v6-u-color-200 pf-v6-u-mb-md">
              {t(
                'Pools with usage over {{threshold}}% may require immediate action to prevent issues.',
                { threshold: POOL_FULL_THRESHOLD }
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
          <div className="pf-v6-u-text-align-center pf-v6-u-p-xl pf-v6-u-color-200">
            <Skeleton
              height="40%"
              screenreaderText={t('Loading pool utilization...')}
            />
          </div>
        )}
        {!loading && !_.isEmpty(error) && (
          <div className="pf-v6-u-text-align-center pf-v6-u-p-xl pf-v6-u-danger-color-100">
            {t('Error loading pool utilization data')}
          </div>
        )}
        {!loading && !error && poolsNeedingAttention.length === 0 && (
          <Flex
            direction={{ default: 'column' }}
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentCenter' }}
            className="pf-v6-u-p-2xl"
            style={{ minHeight: '200px' }}
          >
            <CheckCircleIcon
              className="pf-v6-u-mb-md"
              style={{ color: successColor.value, fontSize: '3rem' }}
            />
            <p className="pf-v6-u-font-size-xl pf-v6-u-color-100 pf-v6-u-m-0">
              {t('Utilization is good!')}
            </p>
          </Flex>
        )}
      </CardBody>
    </Card>
  );
};

export default PoolUtilizationCard;
