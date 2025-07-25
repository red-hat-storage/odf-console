import * as React from 'react';
import { getCephBlockPoolResource } from '@odf/core/resources';
import { getResourceInNs as getCephClusterInNs } from '@odf/core/utils';
import { CephFileSystemModel } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { CephClusterModel } from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  useK8sWatchResource,
  useK8sWatchResources,
  WatchK8sResources,
  WatchK8sResults,
} from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { TFunction } from 'react-i18next';
import { getPoolQuery, StorageDashboardQuery } from '../queries';
import { StoragePoolKind, CephFilesystemKind } from '../types';
import {
  getPerPoolMetrics,
  getStoragePoolsFromBlockPools,
  getStoragePoolsFromFilesystem,
} from '../utils';
import { getCephHealthState } from '../utils/ceph-health';
import {
  getPoolUtilizationPercentage,
  getPoolUtilizationState,
  PoolUtilizationState,
} from '../utils/pool-utilization';

export type StorageClusterStatus = {
  health: SubsystemHealth;
  loaded: boolean;
  loadError: any;
  cephHealth: SubsystemHealth;
  poolsHealth: SubsystemHealth;
  pools: PoolHealthInfo[];
};

export type PoolHealthInfo = {
  name: string;
  utilization: number;
  state: PoolUtilizationState;
  health: SubsystemHealth;
};

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
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

export const useStorageClusterStatus = (
  namespace: string,
  t: TFunction,
  managedByOCS: string
): StorageClusterStatus => {
  const [cephClusters, cephLoaded, cephLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(cephClusterResource);

  const resources = useK8sWatchResources(
    managedByOCS ? getResources(namespace, managedByOCS) : {}
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

  const [poolUtilizationData, poolMetricsError, poolMetricsLoaded] =
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

  const cephCluster = getCephClusterInNs(cephClusters, namespace);
  const cephHealthState = getCephHealthState(
    {
      ceph: { data: cephCluster, loaded: cephLoaded, loadError: cephLoadError },
    },
    t
  );

  const poolUtilizationMetrics = getPerPoolMetrics(
    poolUtilizationData,
    poolMetricsError,
    poolMetricsLoaded
  );

  const poolsHealthInfo = React.useMemo(() => {
    try {
      const poolsLoaded = blockPools?.loaded && filesystem?.loaded;
      const hasMetrics =
        poolUtilizationMetrics &&
        Object.keys(poolUtilizationMetrics).length > 0;

      if (!poolsLoaded || !hasMetrics) {
        return [];
      }

      return allPools.map((pool) => {
        const poolName = pool.metadata?.name;
        const utilization = getPoolUtilizationPercentage(
          poolUtilizationMetrics,
          poolName
        );
        const utilizationInfo = getPoolUtilizationState(utilization, t);

        return {
          name: poolName,
          utilization,
          state: utilizationInfo.state,
          health: {
            state: utilizationInfo.severity,
            message: utilizationInfo.message,
          },
        };
      });
    } catch {
      return [];
    }
  }, [
    allPools,
    blockPools?.loaded,
    filesystem?.loaded,
    poolUtilizationMetrics,
    t,
  ]);

  const poolsHealth = React.useMemo(() => {
    if (!poolsHealthInfo.length) {
      return { state: HealthState.OK };
    }

    let worstPoolHealth: SubsystemHealth = { state: HealthState.OK };
    let criticalPools = 0;
    let warningPools = 0;

    poolsHealthInfo.forEach((pool) => {
      if (pool.health.state === HealthState.ERROR) {
        criticalPools++;
      } else if (pool.health.state === HealthState.WARNING) {
        warningPools++;
      }
    });

    if (criticalPools > 0) {
      worstPoolHealth = {
        state: HealthState.ERROR,
        message:
          criticalPools === 1
            ? t('Storage pool critically full')
            : t('{{count}} storage pools critically full', {
                count: criticalPools,
              }),
      };
    } else if (warningPools > 0) {
      worstPoolHealth = {
        state: HealthState.WARNING,
        message:
          warningPools === 1
            ? t('Storage pool needs attention')
            : t('{{count}} storage pools need attention', {
                count: warningPools,
              }),
      };
    }

    return worstPoolHealth;
  }, [poolsHealthInfo, t]);

  const overallHealth = React.useMemo(() => {
    try {
      if (cephHealthState.state === HealthState.ERROR) {
        return cephHealthState;
      }

      if (cephHealthState.state === HealthState.WARNING) {
        if (poolsHealth.state !== HealthState.OK) {
          return {
            ...cephHealthState,
            message: `${cephHealthState.message}. ${poolsHealth.message}`,
          };
        }
        return cephHealthState;
      }

      if (poolsHealth.state !== HealthState.OK) {
        return poolsHealth;
      }

      return { state: HealthState.OK };
    } catch {
      return {
        state: HealthState.UNKNOWN,
        message: 'Error calculating health status',
      };
    }
  }, [cephHealthState, poolsHealth]);

  const loaded =
    cephLoaded && blockPools?.loaded && filesystem?.loaded && poolMetricsLoaded;
  const loadError =
    cephLoadError ||
    blockPools?.loadError ||
    filesystem?.loadError ||
    poolMetricsError;

  return {
    health: overallHealth,
    loaded,
    loadError,
    cephHealth: cephHealthState,
    poolsHealth,
    pools: poolsHealthInfo,
  };
};
