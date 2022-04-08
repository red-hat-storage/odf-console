import * as React from 'react';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import { getGaugeValue, humanizeBinaryBytes } from '@odf/shared/utils';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import {
  POOL_STORAGE_EFFICIENCY_QUERIES,
  StorageDashboardQuery,
} from '../../../queries';

const StorageEfficiencyCard: React.FC = () => {
  const { t } = useTranslation();

  const [poolCapacityRatioResult, poolCapacityRatioResultError] =
    usePrometheusPoll({
      query:
        POOL_STORAGE_EFFICIENCY_QUERIES[
          StorageDashboardQuery.POOL_CAPACITY_RATIO
        ],
    endpoint: 'api/v1/query' as any,
    });

  const [poolSavedResult, poolSavedResultError] = usePrometheusPoll({
    query:
      POOL_STORAGE_EFFICIENCY_QUERIES[
        StorageDashboardQuery.POOL_CAPACITY_RATIO
      ],
    endpoint: 'api/v1/query' as any,
  });
  const ratio = getGaugeValue(poolCapacityRatioResult);
  const saved = getGaugeValue(poolSavedResult);

  const compressionStats = () => {
    const capacityRatio = Number(ratio);
    return t('ceph-storage-plugin~{{capacityRatio, number}}:1', {
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
    title: t('ceph-storage-plugin~Compression ratio'),
    infoText: t(
      'ceph-storage-plugin~The Compression Ratio represents the compressible data effectiveness metric inclusive of all compression-enabled pools.'
    ),
    getStats: compressionStats,
  };

  const savingsProps = {
    stats: Number(saved),
    isLoading: !poolSavedResult && !poolSavedResultError,
    error: !!poolSavedResultError || !saved,
    title: t('ceph-storage-plugin~Savings'),
    infoText: t(
      'ceph-storage-plugin~The Savings metric represents the actual disk capacity saved inclusive of all compression-enabled pools and associated replicas.'
    ),
    getStats: savingStats,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('ceph-storage-plugin~Storage Efficiency')}</CardTitle>
      </CardHeader>
      <CardBody>
        <EfficiencyItemBody {...compressionRatioProps} />
        <EfficiencyItemBody {...savingsProps} />
      </CardBody>
    </Card>
  );
};

export default StorageEfficiencyCard;
