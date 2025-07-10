import * as React from 'react';
import { GraphEmpty } from '@odf/shared/charts';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import {
  UtilizationDurationDropdown,
  UtilizationBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { Card, CardBody, CardHeader, CardTitle } from '@patternfly/react-core';
import { useStorageClassQueryFilter } from '../../hooks';
import {
  StorageDashboardQuery,
  INDEPENDENT_UTILIZATION_QUERIES,
} from '../../queries';
import { OCSDashboardContext } from '../ocs-dashboard-providers';

export const UtilizationContent: React.FC = () => {
  const { t } = useCustomTranslation();

  const {
    selectedCluster: { clusterNamespace: clusterNs },
  } = React.useContext(OCSDashboardContext);

  const [scQueryfilter, scQueryfilterLoaded, scQueryfilterError] =
    useStorageClassQueryFilter(clusterNs);

  return (
    <UtilizationBody>
      {scQueryfilterLoaded && !scQueryfilterError && (
        <>
          <PrometheusUtilizationItem
            title={t('Used capacity')}
            utilizationQuery={
              INDEPENDENT_UTILIZATION_QUERIES(scQueryfilter)[
                StorageDashboardQuery.USED_CAPACITY
              ]
            }
            humanizeValue={humanizeBinaryBytes}
            byteDataType={ByteDataTypes.BinaryBytes}
          />
          <PrometheusUtilizationItem
            title={t('Requested capacity')}
            utilizationQuery={
              INDEPENDENT_UTILIZATION_QUERIES(scQueryfilter)[
                StorageDashboardQuery.REQUESTED_CAPACITY
              ]
            }
            humanizeValue={humanizeBinaryBytes}
            byteDataType={ByteDataTypes.BinaryBytes}
          />
        </>
      )}
      {!scQueryfilterLoaded && !scQueryfilterError && <GraphEmpty loading />}
      {!!scQueryfilterError && <GraphEmpty />}
    </UtilizationBody>
  );
};

export const UtilizationCard: React.FC = () => {
  const { t } = useCustomTranslation();
  return (
    <Card>
      <CardHeader
        actions={{
          actions: <UtilizationDurationDropdown />,
          hasNoOffset: false,
          className: undefined,
        }}
      >
        <CardTitle>{t('Utilization')}</CardTitle>
      </CardHeader>
      <CardBody>
        <UtilizationContent />
      </CardBody>
    </Card>
  );
};

export default UtilizationCard;
