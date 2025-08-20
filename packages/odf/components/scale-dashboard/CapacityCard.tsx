import * as React from 'react';
import {
  storageClassByUsedQuery,
  storageClassTotalUsedQuery,
} from '@odf/core/queries';
import { getStackChartStats } from '@odf/ocs/utils';
import { BreakdownCardBody, StorageClassModel } from '@odf/shared';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getInstantVectorStats,
  humanizeBinaryBytes,
  sortInstantVectorStats,
} from '@odf/shared/utils';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';

export const CapacityCard: React.FC<{}> = () => {
  const { t } = useCustomTranslation();
  const [
    storageClassTotalUsed,
    storageClassTotalUsedError,
    storageClassTotalUsedLoading,
  ] = useCustomPrometheusPoll({
    query: storageClassTotalUsedQuery,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [
    storageClassByUsed,
    storageClassByUsedError,
    storageClassByUsedLoading,
  ] = useCustomPrometheusPoll({
    query: storageClassByUsedQuery,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loading = storageClassTotalUsedLoading || storageClassByUsedLoading;
  const loadError = storageClassTotalUsedError || storageClassByUsedError;
  const humanize = humanizeBinaryBytes;
  const top6MetricsData = getInstantVectorStats(
    storageClassByUsed,
    'storageclassp'
  );
  const top5SortedMetricsData = sortInstantVectorStats(top6MetricsData);
  const top5MetricsStats = getStackChartStats(top5SortedMetricsData, humanize);
  const metricTotal: string =
    storageClassTotalUsed?.data?.result?.[0]?.value?.[1];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Requested Capacity')}</CardTitle>
      </CardHeader>
      <CardBody>
        <BreakdownCardBody
          isLoading={loading}
          hasLoadError={loadError}
          metricTotal={metricTotal}
          top5MetricsStats={top5MetricsStats}
          metricModel={StorageClassModel}
          humanize={humanize}
          isPersistentInternal={true}
        />
      </CardBody>
    </Card>
  );
};

export default CapacityCard;
