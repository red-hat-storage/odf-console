import * as React from 'react';
import CapacityCard from '@odf/shared/dashboards/capacity-card/capacity-card';
import { FieldLevelHelp } from '@odf/shared/generic';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { ODFStorageSystem } from '@odf/shared/models';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils/humanize';
import { parseMetricData } from '@odf/shared/utils/metrics';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { externalStorageCapacityUsed } from '../../../constants';
import { StorageDashboard, CAPACITY_QUERIES } from '../queries';

const ObjectCapacityCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [data, error, loading] = useCustomPrometheusPoll({
    query: CAPACITY_QUERIES[StorageDashboard.USED_CAPACITY_OBJECT],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const dataFrames =
    !loading && !error
      ? parseMetricData(data, humanizeBinaryBytes, 'type')
      : [];

  return (
    <Card className="odf-capacityCard--height">
      <CardHeader>
        <CardTitle>
          {t('External object provider used capacity')}
          <FieldLevelHelp>{externalStorageCapacityUsed(t)}</FieldLevelHelp>
        </CardTitle>
      </CardHeader>
      <CardBody>
        <CapacityCard
          isExternalObjectCapacityCard
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
