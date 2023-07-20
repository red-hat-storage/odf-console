export enum PodMetrics {
  CPU = 'CPU',
  MEMORY = 'MEMORY',
}

export const POD_QUERIES = {
  [PodMetrics.CPU]:
    'pod:container_cpu_usage:sum{namespace="openshift-storage"}',
  [PodMetrics.MEMORY]:
    'sum(container_memory_working_set_bytes{namespace="openshift-storage", container=""}) BY (pod, namespace)',
};
