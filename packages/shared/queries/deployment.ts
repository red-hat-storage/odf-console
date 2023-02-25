import * as _ from 'lodash-es';

export enum DeploymentQueries {
  CPU_USAGE = 'CPU_USAGE',
  MEMORY_USAGE = 'MEMORY_USAGE',
  RECEIVE_BANDWIDTH = 'RECEIVE_BANDWIDTH',
  NETWORK_OUT_UTILIZATION = 'NETWORK_OUT_UTILIZATION',
}

const queries = {
  [DeploymentQueries.CPU_USAGE]: _.template(
    `sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace='<%= namespace %>'}
          * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{
          namespace='<%= namespace %>', workload='<%= workloadName %>', workload_type='<%= workloadType %>'}) by (pod)`
  ),
  [DeploymentQueries.MEMORY_USAGE]: _.template(
    `sum(container_memory_working_set_bytes{namespace='<%= namespace %>', container!=""}
          * on(namespace,pod) group_left(workload, workload_type) namespace_workload_pod:kube_pod_owner:relabel{
          namespace='<%= namespace %>', workload='<%= workloadName %>', workload_type='<%= workloadType %>'}) by (pod)`
  ),
  [DeploymentQueries.RECEIVE_BANDWIDTH]: _.template(
    `sum(irate(container_network_receive_bytes_total{namespace='<%= namespace %>'}[4h])
          * on (namespace,pod) group_left(workload,workload_type) namespace_workload_pod:kube_pod_owner:relabel{
          namespace='<%= namespace %>', workload=~'<%= workloadName %>', workload_type='<%= workloadType %>'}) by (pod)`
  ),
};

export const getUtilizationQueries = (
  namespace: string,
  workloadName: string,
  workloadType: string
) => ({
  [DeploymentQueries.CPU_USAGE]: queries[DeploymentQueries.CPU_USAGE]({
    namespace,
    workloadName,
    workloadType,
  }),
  [DeploymentQueries.MEMORY_USAGE]: queries[DeploymentQueries.MEMORY_USAGE]({
    namespace,
    workloadType,
    workloadName,
  }),
  [DeploymentQueries.RECEIVE_BANDWIDTH]: queries[
    DeploymentQueries.RECEIVE_BANDWIDTH
  ]({
    namespace,
    workloadType,
    workloadName,
  }),
});
