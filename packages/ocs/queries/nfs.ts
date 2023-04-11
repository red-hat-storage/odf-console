export enum NFSDashboardQuery {
  HOST_READ_TOTAL = 'HOST_READ_TOTAL',
  HOST_WRITE_TOTAL = 'HOST_WRITE_TOTAL',
  WORKER_THREADS_TOTAL = 'WORKER_THREADS_TOTAL',
  CLIENT_READ_TOTAL = 'CLIENT_READ_TOTAL',
  CLIENT_WRITE_TOTAL = 'CLIENT_WRITE_TOTAL',
  TOPK_CLIENT_TOTAL = 'TOPK_CLIENT_TOTAL',
}

export enum NFSOperation {
  READ = 'read',
  WRITE = 'write',
}

export const NFS_STATUS_QUERY = {
  [NFSDashboardQuery.WORKER_THREADS_TOTAL]: 'worker_threads{label="total"}',
};

// only single server/host in 4.13
export const NFS_HOST_THROUGHPUT_TOTAL = {
  [NFSDashboardQuery.HOST_READ_TOTAL]: {
    query:
      'sum(rate(nfs_bytes_received_total{operation="read"}[1m])) + sum(rate(nfs_bytes_sent_total{operation="read"}[1m]))',
    desc: 'Reads',
  },
  [NFSDashboardQuery.HOST_WRITE_TOTAL]: {
    query:
      'sum(rate(nfs_bytes_received_total{operation="write"}[1m])) + sum(rate(nfs_bytes_sent_total{operation="write"}[1m]))',
    desc: 'Writes',
  },
};

// multiple clients
export const NFS_CLIENT_THROUGHPUT_TOTAL = {
  [NFSDashboardQuery.CLIENT_READ_TOTAL]:
    'sum by (client) (rate(client_bytes_sent_total{operation="read"}[1m])) + sum by (client) (rate(client_bytes_received_total{operation="read"}[1m]))',
  [NFSDashboardQuery.CLIENT_WRITE_TOTAL]:
    'sum by (client) (rate(client_bytes_sent_total{operation="write"}[1m])) + sum by (client) (rate(client_bytes_received_total{operation="write"}[1m]))',
};

// top 3 clients
export const NFS_TOPK_CLIENT_THROUGHPUT_TOTAL = {
  [NFSDashboardQuery.TOPK_CLIENT_TOTAL]: `(sort_desc(topk(3,(${
    NFS_CLIENT_THROUGHPUT_TOTAL[NFSDashboardQuery.CLIENT_READ_TOTAL]
  }+${NFS_CLIENT_THROUGHPUT_TOTAL[NFSDashboardQuery.CLIENT_WRITE_TOTAL]}))))`,
};

// per client
export const nfsPerClientReadWriteThroughputTotal = (
  client: string,
  operation: NFSOperation
) => {
  switch (operation) {
    case NFSOperation.READ:
      return {
        query: `sum(rate(client_bytes_sent_total{client='${client}',operation='${NFSOperation.READ}'}[1m])) + sum(rate(client_bytes_received_total{client='${client}',operation='${NFSOperation.READ}'}[1m]))`,
        desc: 'Reads',
      };
    case NFSOperation.WRITE:
      return {
        query: `sum(rate(client_bytes_sent_total{client='${client}',operation='${NFSOperation.WRITE}'}[1m])) + sum(rate(client_bytes_received_total{client='${client}',operation='${NFSOperation.WRITE}'}[1m]))`,
        desc: 'Writes',
      };
    default:
      return {
        query: null,
        desc: 'N/A',
      };
  }
};
