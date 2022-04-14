import * as React from 'react';
import { ObjectStorageEfficiencyQueries } from '@odf/ocs/queries';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import { humanizeBinaryBytes, humanizePercentage } from '@odf/shared/utils';
import { getGaugeValue } from '@odf/shared/utils';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const StorageEfficiencyCard: React.FC<{}> = () => {
  const { t } = useTranslation();

  const [compressionQueryResult, compressionQueryResultError] = usePrometheusPoll({
    query: ObjectStorageEfficiencyQueries.COMPRESSION_RATIO,
    endpoint: 'api/v1/query' as any,
  });
  const [savingsQueryResult, savingsQueryResultError] = usePrometheusPoll({
    query: ObjectStorageEfficiencyQueries.SAVINGS_QUERY,
    endpoint: 'api/v1/query' as any,
  });
  const [logicalSavingsQueryResult, logicalSavingsQueryResultError] = usePrometheusPoll({
    query: ObjectStorageEfficiencyQueries.LOGICAL_SAVINGS_QUERY,
    endpoint: 'api/v1/query' as any,
  });

  const compressionRatio = getGaugeValue(compressionQueryResult);
  const savings = getGaugeValue(savingsQueryResult);
  const logicalSize = getGaugeValue(logicalSavingsQueryResult);

  const compressionStats = () => {
    const capacityRatio = Number(compressionRatio);
    return t('{{capacityRatio, number}}:1', {
      capacityRatio: Math.round(capacityRatio),
    });
  };

  const savingStats = () => {
    const savedBytes = humanizeBinaryBytes(Number(savings)).string;
    const savingsPercentage = `${savedBytes} (${
      humanizePercentage((100 * Number(savings)) / Number(logicalSize)).string
    })`;
    return savingsPercentage;
  };

  const compressionRatioProps = {
    stats: Number(compressionRatio),
    isLoading: !compressionQueryResult && !compressionQueryResultError,
    error: !!compressionQueryResultError || !compressionRatio || Number(compressionRatio) === 1,
    title: t('Compression ratio'),
    infoText: t(
      'OpenShift Data Foundation can be configured to use compression. The efficiency rate reflects the actual compression ratio when using such a configuration.',
    ),
    getStats: compressionStats,
  };

  const savingsProps = {
    stats: Number(savings),
    isLoading: !savingsQueryResult && !logicalSavingsQueryResult && !savingsQueryResultError,
    error:
      !!savingsQueryResultError || !!logicalSavingsQueryResultError || !savings || !logicalSize,
    title: t('Savings'),
    infoText: t(
      'Savings shows the uncompressed and non-deduped data that would have been stored without those techniques.',
    ),
    getStats: savingStats,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Storage Efficiency')}</CardTitle>
      </CardHeader>
      <CardBody>
        <EfficiencyItemBody {...compressionRatioProps} />
        <EfficiencyItemBody {...savingsProps} />
      </CardBody>
    </Card>
  );
};

export default StorageEfficiencyCard;
