import * as React from 'react';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import {
  getInstantVectorStats,
  humanizeBinaryBytes,
  humanizeNumber,
  humanizePercentage,
} from '@odf/shared/utils';
import {
  DetailItem,
  DetailsBody,
  usePrometheusPoll,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const CompressionDetailsCard: React.FC = () => {
  const { t } = useTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);

  const compressionMode = obj.spec?.compressionMode;
  const compressionEnabled = compressionMode !== 'none';
  const { name } = obj.metadata;

  // Compression Metrics
  const queries = React.useMemo(
    () => [
      getPoolQuery([name], StorageDashboardQuery.POOL_COMPRESSION_SAVINGS),
      getPoolQuery([name], StorageDashboardQuery.POOL_COMPRESSION_ELIGIBILITY),
      getPoolQuery([name], StorageDashboardQuery.POOL_COMPRESSION_RATIO),
    ],
    [name]
  );

  const [poolCompressionSavings, savingsError, savingsLoading] =
    usePrometheusPoll({
      query: queries[0],
      endpoint: 'api/v1/query' as any,
    });

  const [poolCompressionEligibility, eligibilityError, eligibilityLoading] =
    usePrometheusPoll({
      query: queries[1],
      endpoint: 'api/v1/query' as any,
    });

  const [poolCompressionRatio, ratioError, ratioLoading] = usePrometheusPoll({
    query: queries[2],
    endpoint: 'api/v1/query' as any,
  });

  const compressionEligibilityProps = {
    stats: Number(getInstantVectorStats(poolCompressionEligibility)),
    isLoading: eligibilityLoading,
    error: eligibilityError || !poolCompressionEligibility,
    title: t('Compression eligibility'),
    getStats: () => humanizePercentage(poolCompressionEligibility).string,
    infoText: t(
      'Compression eligibility indicates the percentage of incoming data that is compressible'
    ),
  };

  const compressionSavingsProps = {
    stats: Number(getInstantVectorStats(poolCompressionSavings)),
    isLoading: savingsLoading,
    error: savingsError || !poolCompressionSavings,
    title: t('Compression savings'),
    getStats: () => humanizeBinaryBytes(poolCompressionSavings).string,
    infoText: t(
      'Compression savings indicates the total savings gained from compression for this pool, including replicas'
    ),
  };

  const compressionRatioProps = {
    stats: Number(getInstantVectorStats(poolCompressionRatio)),
    isLoading: ratioLoading,
    error: ratioError || !poolCompressionRatio,
    title: t('Compression ratio'),
    getStats: () => `${humanizeNumber(poolCompressionRatio).string}:1`,
    infoText: t(
      'Compression ratio indicates the achieved compression on eligible data for this pool'
    ),
  };

  const loading = ratioLoading || savingsLoading || eligibilityLoading;

  return (
    <Card data-test-id="compression-details-card">
      <CardHeader>
        <CardTitle>{t('Compression')}</CardTitle>
      </CardHeader>
      <CardBody>
        <DetailsBody>
          <DetailItem isLoading={!obj} title={t('Compression status')}>
            {!compressionEnabled ? t('Disabled') : t('Enabled')}
          </DetailItem>
        </DetailsBody>
        {compressionEnabled && (
          <DetailsBody>
            <div>
              <DetailsBody>
                <DetailItem isLoading={loading} title={t('Storage efficiency')}>
                  <EfficiencyItemBody {...compressionEligibilityProps} />
                  <EfficiencyItemBody {...compressionRatioProps} />
                  <EfficiencyItemBody {...compressionSavingsProps} />
                </DetailItem>
              </DetailsBody>
            </div>
          </DetailsBody>
        )}
      </CardBody>
    </Card>
  );
};
