import * as React from 'react';
import { PrometheusMultilineUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-multi-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeDecimalBytesPerSec } from '@odf/shared/utils';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { NFS_HOST_THROUGHPUT_TOTAL, NFSDashboardQuery } from '../../../queries';

export const ThroughputCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card data-test="nfs-throughput-card">
      <CardHeader
        actions={{
          actions: <UtilizationDurationDropdown />,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>{t('Performance')}</CardTitle>
      </CardHeader>
      <CardBody>
        <PrometheusMultilineUtilizationItem
          title={t('Server throughput')}
          queries={[
            NFS_HOST_THROUGHPUT_TOTAL[NFSDashboardQuery.HOST_READ_TOTAL],
            NFS_HOST_THROUGHPUT_TOTAL[NFSDashboardQuery.HOST_WRITE_TOTAL],
          ]}
          humanizeValue={humanizeDecimalBytesPerSec}
          chartType="stacked-area"
        />
      </CardBody>
    </Card>
  );
};
