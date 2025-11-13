import * as React from 'react';
import { useRawCapacity } from '@odf/core/hooks';
import { useGetInternalClusterDetails } from '@odf/core/redux/utils';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { parser } from '@odf/shared/utils';
import {
  CapacityCard,
  CapacityCardProps,
} from '../../common/capacity-card/capacity-card';

const RawCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { clusterName } = useGetInternalClusterDetails();

  const [totalCapacity, usedCapacity, loading, loadError] =
    useRawCapacity(clusterName);

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
