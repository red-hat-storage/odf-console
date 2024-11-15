import * as React from 'react';
import { nodeResource } from '@odf/core/resources';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import {
  NodeQueries,
  allNodesUtilizationQueries,
} from '@odf/shared/queries/node';
import {
  NodeKind,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { NodeData } from '../types';

/**
 * Note: Reference of "nodesData" changes frequently due to recomputation caused by Prometheus response.
 * That is, "utilization" updates every few seconds.
 * Make sure to optimise on the consumer FC side (in case really needed or if it affects the FC's performance).
 */
export const useNodesData = (): [NodeData[], boolean, any] => {
  const [nodes, nodesLoaded, nodesLoadError] =
    useK8sWatchResource<NodeKind[]>(nodeResource);
  const [utilization, promError, promLoading] = useCustomPrometheusPoll({
    query: allNodesUtilizationQueries[NodeQueries.ALL_NODES_MEMORY_TOTAL],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const loaded = nodesLoaded && !promLoading;
  const error = nodesLoadError || promError;
  const nodesData = React.useMemo(() => {
    let nodesData = [];
    // For data consistency, we must return nodes with their metrics.
    if (nodes && utilization && loaded && !error) {
      nodesData = nodes.map((node: Partial<NodeData>): NodeData => {
        const metric = _.find(utilization.data.result, [
          'metric.instance',
          node.metadata.name,
        ]);
        node['metrics'] = { memory: metric ? metric.value[1] : undefined };
        return node as NodeData;
      });
    }
    return nodesData;
  }, [nodes, utilization, loaded, error]);

  return [nodesData, loaded, error];
};
