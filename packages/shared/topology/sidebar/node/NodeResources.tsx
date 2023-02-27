import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { PodModel } from '@odf/shared/models';
import { POD_QUERIES, PodMetrics } from '@odf/shared/queries/pod';
import {
  PodsOverviewList,
  PodWithMetricsKind,
} from '@odf/shared/topology/sidebar/common/PodList';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  PrometheusResponse,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { NodeKind, PodKind } from 'packages/shared/types';
import { Title } from '@patternfly/react-core';
import '@odf/shared/topology/sidebar/common/resources-tab.scss';

const getPodMetric = (
  metrics: PrometheusResponse['data']['result'],
  podName
): number => {
  const podMetric = _.findIndex(
    metrics,
    (metric: any) => _.get(metric, 'metric.pod', '') === podName
  );
  return podMetric > -1 ? Number(metrics[podMetric]['value'][1]) : NaN;
};

type NodeResourcesProps = {
  node: NodeKind;
};

export const NodeResources: React.FC<NodeResourcesProps> = ({ node }) => {
  const { t } = useCustomTranslation();
  const [pods, loaded, loadError] = useK8sWatchResource<PodWithMetricsKind[]>({
    kind: PodModel.kind,
    isList: true,
    namespaced: true,
    namespace: CEPH_STORAGE_NAMESPACE,
  });

  const filteredPods =
    loaded && !loadError && !_.isEmpty(pods)
      ? pods.filter(
          (pod: PodKind) => pod?.spec?.nodeName === node.metadata.name
        )
      : [];

  const basePath = usePrometheusBasePath();
  const [usedCpu, errorUsedCpu, loadingUsedCpu] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: POD_QUERIES[PodMetrics.CPU],
    basePath: basePath,
  });
  const [usedMemory, errorUsedMemory, loadingUsedMemory] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: POD_QUERIES[PodMetrics.MEMORY],
      basePath: basePath,
    });

  for (let podIndex = 0; podIndex < filteredPods.length; podIndex++) {
    filteredPods[podIndex].metrics = { cpu: NaN, memory: NaN };

    if (usedCpu && _.isEmpty(errorUsedCpu) && !loadingUsedCpu) {
      filteredPods[podIndex].metrics.cpu = getPodMetric(
        usedCpu.data.result,
        filteredPods[podIndex].metadata.name
      );
    }
    if (usedMemory && _.isEmpty(errorUsedMemory) && !loadingUsedMemory) {
      filteredPods[podIndex].metrics.memory = getPodMetric(
        usedMemory.data.result,
        filteredPods[podIndex].metadata.name
      );
    }
  }

  return (
    <div className="odf-m-pane__body topology-sidebar-tab__resources">
      {loaded && _.isEmpty(loadError) ? (
        <>
          <Title headingLevel="h3">
            {t('Pods')} ({filteredPods.length})
          </Title>
          {filteredPods.length > 0 && <PodsOverviewList pods={filteredPods} />}
        </>
      ) : (
        <DataUnavailableError />
      )}
    </div>
  );
};
