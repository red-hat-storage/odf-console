import * as React from 'react';
import { GraphEmpty } from '@odf/shared/charts';
import { PrometheusMultilineUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-multi-utilization-item';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeDecimalBytesPerSec } from '@odf/shared/utils';
import { PrometheusResult } from '@openshift-console/dynamic-plugin-sdk';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import {
  NFS_TOPK_CLIENT_THROUGHPUT_TOTAL,
  NFSDashboardQuery,
  nfsPerClientReadWriteThroughputTotal,
  NFSOperation,
} from '../../../queries';

export const TopClientsCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [topClients, topClientsError, topClientsLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query:
        NFS_TOPK_CLIENT_THROUGHPUT_TOTAL[NFSDashboardQuery.TOPK_CLIENT_TOTAL],
      basePath: usePrometheusBasePath(),
    });

  const clientNames: string[] = React.useMemo(
    () =>
      !topClientsLoading && !topClientsError
        ? topClients?.data?.result?.map(
            (item: PrometheusResult) => item?.metric?.client
          )
        : [],
    [topClients, topClientsError, topClientsLoading]
  );

  return (
    <Card data-test="nfs-details-card">
      <CardHeader
        actions={{
          actions: <UtilizationDurationDropdown />,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>{t('Top clients')}</CardTitle>
      </CardHeader>
      <CardBody>
        {!!clientNames.length &&
          clientNames.map((clientName) => (
            <PrometheusMultilineUtilizationItem
              title={t('Client: {{ clientName }}', { clientName })}
              queries={[
                nfsPerClientReadWriteThroughputTotal(
                  clientName,
                  NFSOperation.READ
                ),
                nfsPerClientReadWriteThroughputTotal(
                  clientName,
                  NFSOperation.WRITE
                ),
              ]}
              humanizeValue={humanizeDecimalBytesPerSec}
              chartType="stacked-area"
              key={clientName}
            />
          ))}
        {!clientNames.length && (
          <GraphEmpty loading={topClientsLoading && !topClientsError} />
        )}
      </CardBody>
    </Card>
  );
};
