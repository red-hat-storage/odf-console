import * as React from 'react';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  DaemonSetModel,
  PodModel,
  ReplicaSetModel,
  StatefulSetModel,
} from '@odf/shared/models';
import { POD_QUERIES, PodMetrics } from '@odf/shared/queries/pod';
import { DeploymentKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import {
  K8sResourceCommon,
  PrometheusResponse,
  PrometheusResult,
  useK8sWatchResource,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { isPodInDeployment } from '../../utils/resource';
import { PodsOverviewList, PodWithMetricsKind } from '../common/PodList';
import './node-resources.scss';

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
  deployment: DeploymentKind;
};

export const DeploymentResources: React.FC<DeploymentResourceProps> = ({
  deployment,
}) => {
  const { t } = useCustomTranslation();
  const [pods, podsLoaded, podsLoadError] = useK8sWatchResource<
    PodWithMetricsKind[]
  >({
    kind: PodModel.kind,
    isList: true,
    namespaced: true,
    namespace: CEPH_STORAGE_NAMESPACE,
  });

  const [statefulSets, statefulSetLoaded, statefulSetError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfStatefulSetResource);

  const [replicaSets, replicaSetsLoaded, replicaSetsError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfReplicaSetResource);

  const [daemonSets, daemonSetsLoaded, daemonSetError] =
    useK8sWatchResource<K8sResourceCommon[]>(odfDaemonSetResource);

  const memoizedStatefulSets = useDeepCompareMemoize(statefulSets, true);
  const memoizedReplicaSets = useDeepCompareMemoize(replicaSets, true);
  const memoizedDaemonSets = useDeepCompareMemoize(daemonSets, true);

  const loaded =
    statefulSetLoaded && replicaSetsLoaded && daemonSetsLoaded && podsLoaded;
  const loadError =
    statefulSetError || replicaSetsError || daemonSetError || podsLoadError;
  const filteredPods = React.useMemo(() => {
    const resources = [
      ...memoizedReplicaSets,
      ...memoizedDaemonSets,
      ...memoizedStatefulSets,
      deployment,
    ];
    return loaded && !loadError && !_.isEmpty(pods)
      ? pods.filter((pod) => isPodInDeployment(pod, ...resources))
      : [];
  }, [
    deployment,
    loadError,
    loaded,
    memoizedDaemonSets,
    memoizedReplicaSets,
    memoizedStatefulSets,
    pods,
  ]);

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
    <div className="odf-m-pane__body topology-sidebar-tab-observe">
      <h3>
        {t('Pods')} ({filteredPods.length})
      </h3>
      {filteredPods.length > 0 && (
        <>
          <PodsOverviewList pods={filteredPods} />
        </>
      )}
    </div>
  );
};
