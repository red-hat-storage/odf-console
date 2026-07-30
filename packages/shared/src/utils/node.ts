import {
  NodeAddress,
  NodeKind,
  NodeMachineAndNamespace,
} from '@odf/shared/types';
import * as _ from 'lodash-es';
import { RACK_LABEL } from '../constants';

const NODE_ROLE_PREFIX = 'node-role.kubernetes.io/';

export const getProviderID = (node: NodeKind) => node.spec.providerID || '';

export const getNodeAddresses = (node: NodeKind): NodeAddress[] =>
  node?.status?.addresses || [];

export const getNodeInstanceType = (node: NodeKind): string =>
  node.metadata.labels?.['beta.kubernetes.io/instance-type'];

export const getNodeMachineNameAndNamespace = (
  node: NodeKind
): NodeMachineAndNamespace => {
  const machine = _.get(
    node,
    'metadata.annotations["machine.openshift.io/machine"]',
    '/'
  );
  const [namespace, name] = machine.split('/');
  return { namespace, name };
};

export const getNodeRoles = (node: NodeKind): string[] => {
  const labels = _.get(node, 'metadata.labels');
  return _.reduce(
    labels,
    (acc: string[], _v: string, k: string) => {
      if (k.startsWith(NODE_ROLE_PREFIX)) {
        acc.push(k.slice(NODE_ROLE_PREFIX.length));
      }
      return acc;
    },
    []
  );
};

export const isControlPlaneNode = (node: NodeKind): boolean => {
  const roles = getNodeRoles(node);
  return roles.includes('control-plane') || roles.includes('master');
};

export const isWorkerNode = (node: NodeKind): boolean =>
  getNodeRoles(node).includes('worker') && !isControlPlaneNode(node);

export const getNodeZone = (node: NodeKind): string =>
  node.metadata.labels?.['topology.kubernetes.io/zone'];

export const getRack = (node: NodeKind) => node.metadata.labels?.[RACK_LABEL];

export const getNodeArchitecture = (node: NodeKind): string =>
  (node?.status?.nodeInfo as { architecture?: string } | undefined)
    ?.architecture ?? '';

export const OCS_CLUSTER_NODE_LABEL_PREFIX = 'cluster.ocs.openshift.io/';

export const isOcsLabeledNode = (node: {
  labels?: { [key: string]: string };
}): boolean =>
  Object.keys(node?.labels || {}).some((key) =>
    key.startsWith(OCS_CLUSTER_NODE_LABEL_PREFIX)
  );
