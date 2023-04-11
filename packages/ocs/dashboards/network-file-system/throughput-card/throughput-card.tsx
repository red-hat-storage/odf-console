import * as React from 'react';
import { PrometheusMultilineUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-multi-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeDecimalBytesPerSec } from '@odf/shared/utils';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  Card,
  CardBody,
  CardActions,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { NFS_HOST_THROUGHPUT_TOTAL, NFSDashboardQuery } from '../../../queries';

export const ThroughputCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card data-test="nfs-throughput-card">
      <CardHeader>
        <CardTitle>{t('Performance')}</CardTitle>
        <CardActions>
          <UtilizationDurationDropdown />
        </CardActions>
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
