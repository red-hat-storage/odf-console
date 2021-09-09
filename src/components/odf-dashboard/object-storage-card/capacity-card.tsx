import * as React from 'react';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  usePrometheusPoll,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-api';
import { useTranslation } from 'react-i18next';
import { humanizeBinaryBytes } from '../../../humanize';
import CapacityCard from '../../common/capacity-card/capacity-card';
import { CAPACITY_QUERIES, StorageDashboard } from '../queries';

const parseMetricData = (metric: PrometheusResponse) =>
  metric.data.result.map((datum) => ({
    name: datum.metric.type,
    usedValue: humanizeBinaryBytes(datum.value[1]),
  }));

const ObjectCapacityCard: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const [data, error, loaded] = usePrometheusPoll({
    query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_OBJECT],
    endpoint: 'api/v1/query' as any,
  });

  const dataFrames = !loaded && !error ? parseMetricData(data) : [];

  return (
    <DashboardCard className="odf-capacityCard--height">
      <DashboardCardHeader>
        <DashboardCardTitle>
          {t('External Object Provider Used Capacity')}
        </DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody>
        <CapacityCard data={dataFrames} relative isPercentage={false} />
      </DashboardCardBody>
    </DashboardCard>
  );
};

export default ObjectCapacityCard;
