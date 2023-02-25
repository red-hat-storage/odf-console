import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { DeploymentModel } from '@odf/shared/models';
import {
  DeploymentQueries,
  getUtilizationQueries,
} from '@odf/shared/queries/deployment';
import { getName } from '@odf/shared/selectors';
import { DeploymentKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeCpuCores, humanizeBinaryBytes } from '@odf/shared/utils';
import { UtilizationBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import { Card, CardHeader, CardTitle } from '@patternfly/react-core';
import '../node/node-observe.scss';

type NodeObserveProps = {
  deployment: DeploymentKind;
};

export const DeploymentObserve: React.FC<NodeObserveProps> = ({
  deployment,
}) => {
  const { t } = useCustomTranslation();

  const name = getName(deployment);

  const utilizationQueries = getUtilizationQueries(
    CEPH_STORAGE_NAMESPACE,
    name,
    DeploymentModel.kind.toLowerCase()
  );

  return (
    <Card className="node-observe-tab" data-test-id="node-observe-tab">
      <CardHeader>
        <CardTitle>{t('Metrics')}</CardTitle>
      </CardHeader>
      <UtilizationBody>
        <PrometheusUtilizationItem
          title={t('CPU usage')}
          humanizeValue={humanizeCpuCores}
          utilizationQuery={utilizationQueries[DeploymentQueries.CPU_USAGE]}
        />
        <PrometheusUtilizationItem
          title={t('Memory')}
          humanizeValue={humanizeBinaryBytes}
          utilizationQuery={utilizationQueries[DeploymentQueries.MEMORY_USAGE]}
          byteDataType={ByteDataTypes.BinaryBytes}
        />
        <PrometheusUtilizationItem
          title={t('Receive bandwidth')}
          humanizeValue={humanizeBinaryBytes}
          utilizationQuery={
            utilizationQueries[DeploymentQueries.RECEIVE_BANDWIDTH]
          }
          byteDataType={ByteDataTypes.DecimalBytes}
        />
      </UtilizationBody>
    </Card>
  );
};
