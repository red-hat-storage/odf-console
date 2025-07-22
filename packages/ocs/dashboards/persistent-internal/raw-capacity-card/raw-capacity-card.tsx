import * as React from 'react';
import { useRawCapacity } from '@odf/core/hooks';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { parser } from '@odf/shared/utils';
import {
  CapacityCard,
  CapacityCardProps,
} from '../../common/capacity-card/capacity-card';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';

const RawCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { systemFlags } = useODFSystemFlagsSelector();
  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);
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
