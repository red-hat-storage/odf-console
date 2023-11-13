export enum PodMetrics {
  CPU = 'CPU',
  MEMORY = 'MEMORY',
}

export const POD_QUERIES = (ns: string) => ({
  [PodMetrics.CPU]: `pod:container_cpu_usage:sum{namespace="${ns}"}`,
  [PodMetrics.MEMORY]: `sum(container_memory_working_set_bytes{namespace="${ns}", container=""}) BY (pod, namespace)`,
});
