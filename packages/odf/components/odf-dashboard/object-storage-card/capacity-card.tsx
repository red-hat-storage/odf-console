import * as React from 'react';
import CapacityCard from '@odf/shared/dashboards/capacity-card/capacity-card';
import { humanizeBinaryBytes } from '@odf/shared/utils/humanize';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';
import { useTranslation } from 'react-i18next';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { ODFStorageSystem } from '../../../models';
import { CAPACITY_QUERIES, StorageDashboard } from '../queries';

const parseMetricData = (metric: PrometheusResponse) =>
  metric?.data?.result?.map((datum) => ({
    name: datum?.metric?.type,
    usedValue: humanizeBinaryBytes(datum?.value?.[1]),
  })) || [];

const ObjectCapacityCard: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const [data, error, loading] = usePrometheusPoll({
    query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_OBJECT],
    endpoint: 'api/v1/query' as any,
  });

  const dataFrames = !loading && !error ? parseMetricData(data) : [];

  return (
    <Card className="odf-capacityCard--height">
      <CardHeader>
        <CardTitle>{t('External Object Provider Used Capacity')}</CardTitle>
      </CardHeader>
      <CardBody>
        <CapacityCard
          data={dataFrames}
          relative
          showPercentage={false}
          resourceModel={ODFStorageSystem}
        />
      </CardBody>
    </Card>
  );
};

export default ObjectCapacityCard;
