export const IBM_SCALE_NAMESPACE = 'ibm-spectrum-scale';
export const IBM_SCALE_OPERATOR_NAME = 'ibm-spectrum-scale-operator';
export const IBM_SCALE_LOCAL_CLUSTER_NAME = 'ibm-spectrum-scale';
export const SCALE_DAEMON_NODE_LABEL = 'scale.spectrum.ibm.com/daemon-selector';
export const SAN_STORAGE_SYSTEM_NAME = 'SAN_Storage';
export const KMM_OPERATOR_NAME = 'kernel-module-management';
export const KMM_OPERATOR_NAMESPACE = 'openshift-kmm';

/** topology.kubernetes.io/zone value for the arbiter node in a stretch cluster */
export const ARBITER_ZONE = 'arbiter';

export const LOCAL_CLUSTER_NODE_ROLE_LABEL = 'node-role';

export enum NodeType {
  ARBITER = 'arbiter-node',
  CLUSTER = 'cluster-node',
  DISK = 'disk-node',
}
