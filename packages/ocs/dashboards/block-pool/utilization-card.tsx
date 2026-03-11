import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeDecimalBytesPerSec } from '@odf/shared/utils';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import { Grid, Card, CardHeader, CardTitle } from '@patternfly/react-core';
import { getPoolQuery, StorageDashboardQuery } from '../../queries';
import { humanizeIOPS } from '../persistent-internal/utilization-card/utils';
import { BlockPoolDashboardContext } from './block-pool-dashboard-context';

export const UtilizationCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { obj } = React.useContext(BlockPoolDashboardContext);
  const { name, namespace: clusterNs } = obj.metadata;

  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  return (
    <Card>
      <CardHeader
        actions={{
          actions: <UtilizationDurationDropdown />,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>{t('Performance')}</CardTitle>
      </CardHeader>
      <Grid className="odf-block-pool-utilization-card-body pf-v6-u-ml-lg pf-v6-u-mr-md">
        <PrometheusUtilizationItem
          title={t('IOPS')}
          utilizationQuery={getPoolQuery(
            [name],
            StorageDashboardQuery.POOL_UTILIZATION_IOPS_QUERY,
            managedByOCS
          )}
          humanizeValue={humanizeIOPS(t)}
        />
        <PrometheusUtilizationItem
          title={t('Throughput')}
          utilizationQuery={getPoolQuery(
            [name],
            StorageDashboardQuery.POOL_UTILIZATION_THROUGHPUT_QUERY,
            managedByOCS
          )}
          humanizeValue={humanizeDecimalBytesPerSec}
        />
      </Grid>
    </Card>
  );
};

export default UtilizationCard;
