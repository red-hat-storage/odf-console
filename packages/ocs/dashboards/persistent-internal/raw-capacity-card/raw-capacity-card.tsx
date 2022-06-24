import * as React from 'react';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getInstantVectorStats } from '@odf/shared/utils';
import { compose } from 'redux';
import {
  CAPACITY_INFO_QUERIES,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';
import {
  CapacityCard,
  CapacityCardProps,
} from '../../common/capacity-card/capacity-card';

// Enchance instantVectorStats to directly parse the values (else loading state won't be accurate)
const parser = compose((val) => val?.[0]?.y, getInstantVectorStats);

const RawCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const [totalCapacity, totalError, totalLoading] = useCustomPrometheusPoll({
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_TOTAL],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [usedCapacity, usedError, usedLoading] = useCustomPrometheusPoll({
    query: CAPACITY_INFO_QUERIES[StorageDashboardQuery.RAW_CAPACITY_USED],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loadError = totalError || usedError;

  const loading = usedLoading || totalLoading;

  const totalCapacityMetric = parser(totalCapacity);
  const usedCapacityMetric = parser(usedCapacity);
  const availableCapacityMetric = totalCapacityMetric - usedCapacityMetric;
  const description = t(
    'Raw capacity is the absolute total disk space available to the array subsystem.'
  );

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

export default RawCapacityCard;
