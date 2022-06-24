import * as React from 'react';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  UtilizationDurationDropdown,
  UtilizationBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import {
  Card,
  CardActions,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import {
  StorageDashboardQuery,
  INDEPENDENT_UTILIZATION_QUERIES,
} from '../../queries';

export const UtilizationCard: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Utilization')}</CardTitle>
        <CardActions>
          <UtilizationDurationDropdown />
        </CardActions>
      </CardHeader>
      <CardBody>
        <UtilizationBody>
          <PrometheusUtilizationItem
            title={t('Used Capacity')}
            utilizationQuery={
              INDEPENDENT_UTILIZATION_QUERIES[
                StorageDashboardQuery.USED_CAPACITY
              ]
            }
            humanizeValue={humanizeBinaryBytes}
            byteDataType={ByteDataTypes.BinaryBytes}
          />
          <PrometheusUtilizationItem
            title={t('Requested capacity')}
            utilizationQuery={
              INDEPENDENT_UTILIZATION_QUERIES[
                StorageDashboardQuery.REQUESTED_CAPACITY
              ]
            }
            humanizeValue={humanizeBinaryBytes}
            byteDataType={ByteDataTypes.BinaryBytes}
          />
        </UtilizationBody>
      </CardBody>
    </Card>
  );
};

export default UtilizationCard;
