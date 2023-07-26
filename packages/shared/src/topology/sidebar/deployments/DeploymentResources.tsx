import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { StatusBox } from '@odf/shared/generic';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  DaemonSetModel,
  PodModel,
  ReplicaSetModel,
  StatefulSetModel,
} from '@odf/shared/models';
import { POD_QUERIES, PodMetrics } from '@odf/shared/queries/pod';
import {
  PodsOverviewList,
  PodWithMetricsKind,
} from '@odf/shared/topology/sidebar/common/PodList';
import { DeploymentKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  PrometheusResponse,
  PrometheusResult,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import '@odf/shared/topology/sidebar/common/resources-tab.scss';

export const odfStatefulSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(StatefulSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfReplicaSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(ReplicaSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

export const odfDaemonSetResource: WatchK8sResource = {
  isList: true,
  kind: referenceForModel(DaemonSetModel),
  namespaced: true,
  namespace: 'openshift-storage',
};

const getPodMetric = (
  metrics: PrometheusResponse['data']['result'],
  podName
): number => {
  const podMetric = _.findIndex(
    metrics,
    (metric: PrometheusResult) => metric?.metric?.pod === podName
  );
  return podMetric > -1 ? Number(metrics[podMetric]['value'][1]) : NaN;
};

type DeploymentResourceProps = {
  resource: DeploymentKind;
};

export const DeploymentResources: React.FC<DeploymentResourceProps> = ({
  resource: deployment,
}) => {
  const { t } = useCustomTranslation();
  const podSelector = deployment.spec.selector;
  const [pods, podsLoaded, podsLoadError] = useK8sWatchResource<
    PodWithMetricsKind[]
  >({
    kind: PodModel.kind,
    isList: true,
    namespaced: true,
    namespace: CEPH_STORAGE_NAMESPACE,
    selector: podSelector,
  });

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

  for (let podIndex = 0; podIndex < pods.length; podIndex++) {
    pods[podIndex].metrics = { cpu: NaN, memory: NaN };

    if (usedCpu && _.isEmpty(errorUsedCpu) && !loadingUsedCpu) {
      pods[podIndex].metrics.cpu = getPodMetric(
        usedCpu.data.result,
        pods[podIndex].metadata.name
      );
    }
    if (usedMemory && _.isEmpty(errorUsedMemory) && !loadingUsedMemory) {
      pods[podIndex].metrics.memory = getPodMetric(
        usedMemory.data.result,
        pods[podIndex].metadata.name
      );
    }
  }

  const loaded = podsLoaded && !loadingUsedCpu && !loadingUsedMemory;

  const loadError = !!(podsLoadError || errorUsedCpu || errorUsedMemory);

  return (
    <div className="odf-m-pane__body topology-sidebar-tab__resources">
      <h3>
        {t('Pods')} ({pods.length})
      </h3>
      <StatusBox loaded={loaded} loadError={loadError} data={pods}>
        <PodsOverviewList pods={pods} />
      </StatusBox>
    </div>
  );
};
