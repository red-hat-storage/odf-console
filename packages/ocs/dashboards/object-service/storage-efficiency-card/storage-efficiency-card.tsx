import * as React from 'react';
import { ObjectStorageEfficiencyQueries } from '@odf/ocs/queries';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes, humanizePercentage } from '@odf/shared/utils';
import { getGaugeValue } from '@odf/shared/utils';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

const StorageEfficiencyCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();

  const [compressionQueryResult, compressionQueryResultError] =
    useCustomPrometheusPoll({
      query: ObjectStorageEfficiencyQueries.COMPRESSION_RATIO,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const [savingsQueryResult, savingsQueryResultError] = useCustomPrometheusPoll(
    {
      query: ObjectStorageEfficiencyQueries.SAVINGS_QUERY,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    }
  );
  const [logicalSavingsQueryResult, logicalSavingsQueryResultError] =
    useCustomPrometheusPoll({
      query: ObjectStorageEfficiencyQueries.LOGICAL_SAVINGS_QUERY,
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
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
    error:
      !!compressionQueryResultError ||
      !compressionRatio ||
      Number(compressionRatio) === 1,
    title: t('Compression ratio'),
    infoText: t(
      'OpenShift Data Foundation can be configured to use compression. The efficiency rate reflects the actual compression ratio when using such a configuration.'
    ),
    getStats: compressionStats,
  };

  const savingsProps = {
    stats: Number(savings),
    isLoading:
      !savingsQueryResult &&
      !logicalSavingsQueryResult &&
      !savingsQueryResultError,
    error:
      !!savingsQueryResultError ||
      !!logicalSavingsQueryResultError ||
      !savings ||
      !logicalSize,
    title: t('Savings'),
    infoText: t(
      'Savings shows the uncompressed and non-deduped data that would have been stored without those techniques.'
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
