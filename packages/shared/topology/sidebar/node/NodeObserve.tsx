import * as React from 'react';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import {
  NodeQueries,
  getUtilizationQueries,
  getResourceQuotaQueries,
} from '@odf/shared/queries/node';
import { NodeKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getNodeAddresses,
  humanizeCpuCores,
  humanizeBinaryBytes,
} from '@odf/shared/utils';
import { UtilizationBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import { ByteDataTypes } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import { Card, CardHeader, CardTitle } from '@patternfly/react-core';
import './node-observe.scss';

type NodeObserveProps = {
  node: NodeKind;
};

export const NodeObserve: React.FC<NodeObserveProps> = ({ node }) => {
  const { t } = useCustomTranslation();

  const nodeName = node.metadata.name;
  const nodeIP = getNodeAddresses(node).find(
    (addr) => addr.type === 'InternalIP'
  )?.address;

  const [utilizationQueries, resourceQuotaQueries] = [
    getUtilizationQueries(nodeName, nodeIP),
    getResourceQuotaQueries(nodeName),
  ];

  return (
    <Card className="node-observe-tab" data-test-id="node-observe-tab">
      <CardHeader>
        <CardTitle>{t('Metrics')}</CardTitle>
      </CardHeader>
      <UtilizationBody>
        <PrometheusUtilizationItem
          title={t('CPU usage')}
          humanizeValue={humanizeCpuCores}
          utilizationQuery={utilizationQueries[NodeQueries.CPU_USAGE]}
          totalQuery={utilizationQueries[NodeQueries.CPU_TOTAL]}
          limitQuery={resourceQuotaQueries[NodeQueries.POD_RESOURCE_LIMIT_CPU]}
          requestQuery={
            resourceQuotaQueries[NodeQueries.POD_RESOURCE_REQUEST_CPU]
          }
        />
        <PrometheusUtilizationItem
          title={t('Memory')}
          humanizeValue={humanizeBinaryBytes}
          utilizationQuery={utilizationQueries[NodeQueries.MEMORY_USAGE]}
          totalQuery={utilizationQueries[NodeQueries.MEMORY_TOTAL]}
          limitQuery={
            resourceQuotaQueries[NodeQueries.POD_RESOURCE_LIMIT_MEMORY]
          }
          requestQuery={
            resourceQuotaQueries[NodeQueries.POD_RESOURCE_REQUEST_MEMORY]
          }
          byteDataType={ByteDataTypes.BinaryBytes}
        />
      </UtilizationBody>
    </Card>
  );
};
