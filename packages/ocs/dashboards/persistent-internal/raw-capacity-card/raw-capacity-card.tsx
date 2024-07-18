import * as React from 'react';
import { useRawCapacity } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { parser } from '@odf/shared/utils';
import { useParams } from 'react-router-dom-v5-compat';
import { ODFSystemParams } from '../../../types';
import {
  CapacityCard,
  CapacityCardProps,
} from '../../common/capacity-card/capacity-card';

const RawCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const clusterName = systemFlags[clusterNs]?.ocsClusterName;

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
