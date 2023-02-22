import * as _ from 'lodash-es';

export enum NodeQueries {
  CPU_USAGE = 'CPU_USAGE',
  CPU_TOTAL = 'CPU_TOTAL',
  MEMORY_USAGE = 'MEMORY_USAGE',
  MEMORY_TOTAL = 'MEMORY_TOTAL',
  POD_COUNT = 'POD_COUNT',
  FILESYSTEM_USAGE = 'FILESYSTEM_USAGE',
  FILESYSTEM_TOTAL = 'FILESYSTEM_TOTAL',
  NETWORK_IN_UTILIZATION = 'NETWORK_IN_UTILIZATION',
  NETWORK_OUT_UTILIZATION = 'NETWORK_OUT_UTILIZATION',
  POD_RESOURCE_LIMIT_CPU = 'POD_RESOURCE_LIMIT_CPU',
  POD_RESOURCE_LIMIT_MEMORY = 'POD_RESOURCE_LIMIT_MEMORY',
  POD_RESOURCE_REQUEST_CPU = 'POD_RESOURCE_REQUEST_CPU',
  POD_RESOURCE_REQUEST_MEMORY = 'POD_RESOURCE_REQUEST_MEMORY',
}

const queries = {
  [NodeQueries.CPU_USAGE]: _.template(
    `instance:node_cpu:rate:sum{instance='<%= node %>'}`
  ),
  [NodeQueries.CPU_TOTAL]: _.template(
    `instance:node_num_cpu:sum{instance='<%= node %>'}`
  ),
  [NodeQueries.MEMORY_USAGE]: _.template(
    `node_memory_MemTotal_bytes{instance='<%= node %>'} - node_memory_MemAvailable_bytes{instance='<%= node %>'}`
  ),
  [NodeQueries.MEMORY_TOTAL]: _.template(
    `node_memory_MemTotal_bytes{instance='<%= node %>'}`
  ),
  [NodeQueries.POD_COUNT]: _.template(
    `kubelet_running_pods{instance=~'<%= ipAddress %>:.*'}`
  ),
  [NodeQueries.FILESYSTEM_USAGE]: _.template(
    `sum(max by (device) (node_filesystem_size_bytes{instance='<%= node %>', device=~"/.*"})) - sum(max by (device) (node_filesystem_avail_bytes{instance='<%= node %>', device=~"/.*"}))`
  ),
  [NodeQueries.FILESYSTEM_TOTAL]: _.template(
    `sum(max by (device) (node_filesystem_size_bytes{instance='<%= node %>', device=~"/.*"}))`
  ),
  [NodeQueries.NETWORK_IN_UTILIZATION]: _.template(
    `instance:node_network_receive_bytes:rate:sum{instance='<%= node %>'}`
  ),
  [NodeQueries.NETWORK_OUT_UTILIZATION]: _.template(
    `instance:node_network_transmit_bytes:rate:sum{instance='<%= node %>'}`
  ),
};

const resourceQuotaQueries = {
  [NodeQueries.POD_RESOURCE_LIMIT_CPU]: _.template(
    `sum(kube_pod_resource_limit{node='<%= node %>',resource='cpu'})`
  ),
  [NodeQueries.POD_RESOURCE_LIMIT_MEMORY]: _.template(
    `sum(kube_pod_resource_limit{node='<%= node %>',resource='memory'})`
  ),
  [NodeQueries.POD_RESOURCE_REQUEST_CPU]: _.template(
    `sum(kube_pod_resource_request{node='<%= node %>',resource='cpu'})`
  ),
  [NodeQueries.POD_RESOURCE_REQUEST_MEMORY]: _.template(
    `sum(kube_pod_resource_request{node='<%= node %>',resource='memory'})`
  ),
};

export const getResourceQuotaQueries = (node: string) => ({
  [NodeQueries.POD_RESOURCE_LIMIT_CPU]: resourceQuotaQueries[
    NodeQueries.POD_RESOURCE_LIMIT_CPU
  ]({
    node,
  }),
  [NodeQueries.POD_RESOURCE_LIMIT_MEMORY]: resourceQuotaQueries[
    NodeQueries.POD_RESOURCE_LIMIT_MEMORY
  ]({ node }),
  [NodeQueries.POD_RESOURCE_REQUEST_CPU]: resourceQuotaQueries[
    NodeQueries.POD_RESOURCE_REQUEST_CPU
  ]({
    node,
  }),
  [NodeQueries.POD_RESOURCE_REQUEST_MEMORY]: resourceQuotaQueries[
    NodeQueries.POD_RESOURCE_REQUEST_MEMORY
  ]({ node }),
});

export const getUtilizationQueries = (node: string, ipAddress: string) => ({
  [NodeQueries.CPU_USAGE]: queries[NodeQueries.CPU_USAGE]({ node }),
  [NodeQueries.CPU_TOTAL]: queries[NodeQueries.CPU_TOTAL]({ node }),
  [NodeQueries.MEMORY_USAGE]: queries[NodeQueries.MEMORY_USAGE]({ node }),
  [NodeQueries.MEMORY_TOTAL]: queries[NodeQueries.MEMORY_TOTAL]({ node }),
  [NodeQueries.POD_COUNT]: queries[NodeQueries.POD_COUNT]({ ipAddress }),
  [NodeQueries.FILESYSTEM_USAGE]: queries[NodeQueries.FILESYSTEM_USAGE]({
    node,
  }),
  [NodeQueries.FILESYSTEM_TOTAL]: queries[NodeQueries.FILESYSTEM_TOTAL]({
    node,
  }),
});
