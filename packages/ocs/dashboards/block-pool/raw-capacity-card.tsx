import * as React from 'react';
import { getInstantVectorStats } from '@odf/shared/utils';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import {
  CapacityCard,
  CapacityCardProps,
} from '../common/capacity-card/capacity-card';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const RawCapacityCard: React.FC = () => {
  const { t } = useTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const { name } = obj.metadata;

  // Metrics
  const queries = React.useMemo(
    () => [
      getPoolQuery([name], StorageDashboardQuery.POOL_RAW_CAPACITY_USED),
      getPoolQuery([name], StorageDashboardQuery.POOL_MAX_CAPACITY_AVAILABLE),
    ],
    [name]
  );
  const [usedCapacityData, usedCapacityLoading, usedCapacityLoadError] =
    usePrometheusPoll({
      query: queries[0],
      endpoint: 'api/v1/query' as any,
    });

  const [availableData, availableLoading, availableError] = usePrometheusPoll({
    query: queries[1],
    endpoint: 'api/v1/query' as any,
  });
  const usedCapacityMetric = getInstantVectorStats(usedCapacityData)?.[0]?.y;
  const availableCapacityMetric = getInstantVectorStats(availableData)?.[0]?.y;
  const totalCapacityMetric = usedCapacityMetric + availableCapacityMetric;
  const description = t(
    'Raw Capacity shows the total physical capacity from all storage media within the storage subsystem'
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
