import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getGaugeValue, humanizeBinaryBytes } from '@odf/shared/utils';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import {
  POOL_STORAGE_EFFICIENCY_QUERIES,
  StorageDashboardQuery,
} from '../../../queries';
import { OCSDashboardContext } from '../../ocs-dashboard-providers';

export const StorageEfficiencyContent: React.FC = () => {
  const { t } = useCustomTranslation();

  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);
  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [poolCapacityRatioResult, poolCapacityRatioResultError] =
    useCustomPrometheusPoll({
      query:
        POOL_STORAGE_EFFICIENCY_QUERIES(managedByOCS)[
          StorageDashboardQuery.POOL_CAPACITY_RATIO
        ],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });

  const [poolSavedResult, poolSavedResultError] = useCustomPrometheusPoll({
    query:
      POOL_STORAGE_EFFICIENCY_QUERIES(managedByOCS)[
        StorageDashboardQuery.POOL_SAVED_CAPACITY
      ],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const ratio = getGaugeValue(poolCapacityRatioResult);
  const saved = getGaugeValue(poolSavedResult);

  const compressionStats = () => {
    const capacityRatio = Number(ratio);
    return t('{{capacityRatio, number}}:1', {
      capacityRatio: Math.round(capacityRatio),
    });
  };

  const savingStats = () => {
    const savingsValue = Number(saved);
    const savedBytes = humanizeBinaryBytes(savingsValue).string;
    return savedBytes;
  };

  const compressionRatioProps = {
    stats: Number(ratio),
    isLoading: !poolCapacityRatioResult && !poolCapacityRatioResultError,
    error: !!poolCapacityRatioResultError || !ratio,
    title: t('Compression ratio'),
    infoText: t(
      'The Compression Ratio represents the compressible data effectiveness metric inclusive of all compression-enabled pools.'
    ),
    getStats: compressionStats,
  };

  const savingsProps = {
    stats: Number(saved),
    isLoading: !poolSavedResult && !poolSavedResultError,
    error: !!poolSavedResultError || !saved,
    title: t('Savings'),
    infoText: t(
      'The Savings metric represents the actual disk capacity saved inclusive of all compression-enabled pools and associated replicas.'
    ),
    getStats: savingStats,
  };
  return (
    <>
      <EfficiencyItemBody {...compressionRatioProps} />
      <EfficiencyItemBody {...savingsProps} />
    </>
  );
};

const StorageEfficiencyCard: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Storage efficiency')}</CardTitle>
      </CardHeader>
      <CardBody>
        <StorageEfficiencyContent />
      </CardBody>
    </Card>
  );
};

export default StorageEfficiencyCard;
