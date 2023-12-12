import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeBinaryBytes } from '@odf/shared/utils';
import {
  UtilizationDurationDropdown,
  UtilizationBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import { useParams } from 'react-router-dom-v5-compat';
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
import { ODFSystemParams } from '../../types';

export const UtilizationContent: React.FC = () => {
  const { t } = useCustomTranslation();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();

  // name of created StorageClasses are prefix by StorageCluster name
  const storageClassNamePrefix = systemFlags[clusterNs]?.ocsClusterName;

  return (
    <UtilizationBody>
      <PrometheusUtilizationItem
        title={t('Used capacity')}
        utilizationQuery={
          INDEPENDENT_UTILIZATION_QUERIES(storageClassNamePrefix)[
            StorageDashboardQuery.USED_CAPACITY
          ]
        }
        humanizeValue={humanizeBinaryBytes}
        byteDataType={ByteDataTypes.BinaryBytes}
      />
      <PrometheusUtilizationItem
        title={t('Requested capacity')}
        utilizationQuery={
          INDEPENDENT_UTILIZATION_QUERIES(storageClassNamePrefix)[
            StorageDashboardQuery.REQUESTED_CAPACITY
          ]
        }
        humanizeValue={humanizeBinaryBytes}
        byteDataType={ByteDataTypes.BinaryBytes}
      />
    </UtilizationBody>
  );
};

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
        <UtilizationContent />
      </CardBody>
    </Card>
  );
};

export default UtilizationCard;
