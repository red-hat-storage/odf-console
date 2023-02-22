import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { PodModel } from '@odf/shared/models';
import { POD_QUERIES, PodMetrics } from '@odf/shared/queries/pod';
import ResourceLink from '@odf/shared/resource-link/resource-link';
import { getUID } from '@odf/shared/selectors';
import { resourceStatus } from '@odf/shared/status/Resource';
import { Status } from '@odf/shared/status/Status';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  formatBytesAsMiB,
  formatCores,
  resourcePathFromModel,
} from '@odf/shared/utils';
import {
  PrometheusResponse,
  ResourceStatus,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { NodeKind, PodKind } from 'packages/shared/types';
import './node-resources.scss';

type PodOverviewItemProps = {
  pod: PodWithMetricsKind;
};

const PodOverviewItem: React.FC<PodOverviewItemProps> = ({ pod }) => {
  const { t } = useCustomTranslation();
  const {
    metadata: { name, namespace },
    metrics: { cpu, memory },
  } = pod;
  const formattedCores = isNaN(cpu) ? 'N/A' : `${formatCores(cpu)} cores`;
  const formattedMemory = isNaN(memory)
    ? 'N/A'
    : `${formatBytesAsMiB(memory)} MiB`;

  return (
    <li className="list-group-item container-fluid">
      <div className="row">
        <span className="col-xs-5">
          <ResourceLink
            link={resourcePathFromModel(PodModel, name, namespace)}
            resourceModel={PodModel}
            resourceName={name}
          />
        </span>
        <span className="col-xs-3">
          <ResourceStatus additionalClassNames="hidden-xs">
            <Status status={resourceStatus(pod)} />
          </ResourceStatus>
        </span>
        <span className="col-xs-2">
          <span className="odf-sidebar-pod-list__item-header">
            {t('Memory')}
          </span>
          <span className="odf-sidebar-pod-list__item-content">
            {formattedMemory}
          </span>
        </span>
        <span className="col-xs-2">
          <span className="odf-sidebar-pod-list__item-header">{t('CPU')}</span>
          <span className="odf-sidebar-pod-list__item-content">
            {formattedCores}
          </span>
        </span>
      </div>
    </li>
  );
};

type PodOverviewListProps = {
  pods: PodWithMetricsKind[];
};

const PodsOverviewList: React.FC<PodOverviewListProps> = ({ pods }) => (
  <ul className="list-group">
    {_.map(pods, (pod) => (
      <PodOverviewItem key={getUID(pod)} pod={pod} />
    ))}
  </ul>
);

type PodWithMetricsKind = PodKind & {
  metrics: {
    cpu: number;
    memory: number;
  };
};

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

const NodeResources: React.FC<NodeResourcesProps> = ({ node }) => {
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
    <div className="co-m-pane__body topology-sidebar-tab-observe">
      <h3>
        {t('Pods')} ({filteredPods.length})
      </h3>
      {filteredPods.length > 0 && (
        <>
          <PodsOverviewList pods={filteredPods}></PodsOverviewList>
        </>
      )}
    </div>
  );
};

export default NodeResources;
