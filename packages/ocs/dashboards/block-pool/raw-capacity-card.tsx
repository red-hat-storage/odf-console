import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInstantVectorStats } from '@odf/shared/utils';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import {
  CapacityCard,
  CapacityCardProps,
} from '../common/capacity-card/capacity-card';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const RawCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const { name, namespace: clusterNs } = obj.metadata;

  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const queries = React.useMemo(
    () => [
      getPoolQuery(
        [name],
        StorageDashboardQuery.POOL_RAW_CAPACITY_USED,
        managedByOCS
      ),
      getPoolQuery(
        [name],
        StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE,
        managedByOCS
      ),
    ],
    [name, managedByOCS]
  );

  const [usedCapacityData, usedCapacityLoading, usedCapacityLoadError] =
    useCustomPrometheusPoll({
      query: queries[0],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [availableData, availableLoading, availableError] =
    useCustomPrometheusPoll({
      query: queries[1],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const usedCapacityMetric = getInstantVectorStats(usedCapacityData)?.[0]?.y;
  const availableCapacityMetric = getInstantVectorStats(availableData)?.[0]?.y;
  const totalCapacityMetric = usedCapacityMetric + availableCapacityMetric;
  const description = t(
    'Raw capacity shows the total physical capacity from all the storage pools in the StorageSystem.'
  );

  const loading = usedCapacityLoading || availableLoading;
  const loadError = usedCapacityLoadError || availableError;

  const props: CapacityCardProps = {
    totalCapacityMetric,
    usedCapacityMetric,
    availableCapacityMetric,
    description,
    loading,
    loadError,
  };

  return <CapacityCard {...props} />;
};
