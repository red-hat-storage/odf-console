import * as React from 'react';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { humanizeDecimalBytesPerSec } from '@odf/shared/utils';
import { UtilizationBody, UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardActions, CardHeader, CardTitle } from '@patternfly/react-core';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import { humanizeIOPS } from '../persistent-internal/utilization-card/utils';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const UtilizationCard: React.FC = () => {
  const { t } = useTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const { name } = obj.metadata;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Performance')}</CardTitle>
        <CardActions>
          <UtilizationDurationDropdown />
        </CardActions>
      </CardHeader>
      <UtilizationBody>
        <PrometheusUtilizationItem
          title={t('IOPS')}
          utilizationQuery={getPoolQuery([name], StorageDashboardQuery.POOL_UTILIZATION_IOPS_QUERY)}
          humanizeValue={humanizeIOPS}
        />
        <PrometheusUtilizationItem
          title={t('Throughput')}
          utilizationQuery={getPoolQuery(
            [name],
            StorageDashboardQuery.POOL_UTILIZATION_THROUGHPUT_QUERY,
          )}
          humanizeValue={humanizeDecimalBytesPerSec}
        />
      </UtilizationBody>
    </Card>
  );
};

export default UtilizationCard;
