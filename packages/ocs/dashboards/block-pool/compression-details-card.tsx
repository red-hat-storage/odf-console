import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getNamespace } from '@odf/shared';
import { EfficiencyItemBody } from '@odf/shared/dashboards/storage-efficiency/storage-efficiency-card-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { OverviewDetailItem as DetailItem } from '@odf/shared/overview-page';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeBinaryBytes,
  humanizePercentage,
  getGaugeValue,
} from '@odf/shared/utils';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DescriptionList,
} from '@patternfly/react-core';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import { getPerPoolMetrics, PoolMetrics } from '../../utils';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const CompressionDetailsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);

  const clusterNs = getNamespace(obj as any);
  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const compressionMode = obj.spec?.compressionMode;
  const compressionEnabled = !!compressionMode && compressionMode !== 'none';
  const { name } = obj.metadata;

  const queries = React.useMemo(
    () => [
      getPoolQuery(
        [name],
        StorageDashboardQuery.POOL_COMPRESSION_SAVINGS,
        managedByOCS
      ),
      getPoolQuery(
        [name],
        StorageDashboardQuery.POOL_COMPRESSION_ELIGIBILITY,
        managedByOCS
      ),
      getPoolQuery(
        [name],
        StorageDashboardQuery.POOL_COMPRESSION_RATIO,
        managedByOCS
      ),
    ],
    [name, managedByOCS]
  );

  const [poolCompressionSavings, savingsError, savingsLoading] =
    useCustomPrometheusPoll({
      query: queries[0],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const compressionSavings: PoolMetrics = getPerPoolMetrics(
    poolCompressionSavings,
    savingsError,
    savingsLoading
  );

  const [poolCompressionEligibility, eligibilityError, eligibilityLoading] =
    useCustomPrometheusPoll({
      query: queries[1],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const compressionEligibility: PoolMetrics = getPerPoolMetrics(
    poolCompressionEligibility,
    eligibilityError,
    eligibilityLoading
  );

  const [poolCompressionRatio, ratioError, ratioLoading] =
    useCustomPrometheusPoll({
      query: queries[2],
      endpoint: 'api/v1/query' as any,
      basePath: usePrometheusBasePath(),
    });
  const compressionRatio = getGaugeValue(poolCompressionRatio);
  const capacityRatio = Number(compressionRatio);

  const compressionEligibilityProps = {
    stats: Number(getInstantVectorStats(poolCompressionEligibility)),
    isLoading: eligibilityLoading,
    error: eligibilityError || !poolCompressionEligibility,
    title: t('Compression eligibility'),
    getStats: () => humanizePercentage(compressionEligibility?.[name])?.string,
    infoText: t(
      'Compression eligibility indicates the percentage of incoming data that is compressible'
    ),
  };
  const compressionSavingsProps = {
    stats: Number(getInstantVectorStats(poolCompressionSavings)),
    isLoading: savingsLoading,
    error: savingsError || !poolCompressionSavings,
    title: t('Compression savings'),
    getStats: () => humanizeBinaryBytes(compressionSavings?.[name])?.string,
    infoText: t(
      'Compression savings indicates the total savings gained from compression for this pool, including replicas'
    ),
  };

  const compressionRatioProps = {
    stats: Number(compressionRatio),
    isLoading: ratioLoading,
    error: ratioError || !capacityRatio,
    title: t('Compression ratio'),
    getStats: () =>
      t('{{capacityRatio, number}}:1', {
        capacityRatio: Math.round(capacityRatio),
      }),
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
        <DescriptionList>
          <DetailItem isLoading={!obj} title={t('Compression status')}>
            {!compressionEnabled ? t('Disabled') : t('Enabled')}
          </DetailItem>
        </DescriptionList>
        {compressionEnabled && (
          <DescriptionList>
            <div>
              <DescriptionList>
                <DetailItem isLoading={loading} title={t('Storage efficiency')}>
                  <EfficiencyItemBody {...compressionEligibilityProps} />
                  <EfficiencyItemBody {...compressionRatioProps} />
                  <EfficiencyItemBody {...compressionSavingsProps} />
                </DetailItem>
              </DescriptionList>
            </div>
          </DescriptionList>
        )}
      </CardBody>
    </Card>
  );
};
