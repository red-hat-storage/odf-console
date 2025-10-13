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

export const getNodeZone = (node: NodeKind): string =>
  node.metadata.labels?.['topology.kubernetes.io/zone'];

export const getRack = (node: NodeKind) => node.metadata.labels?.[RACK_LABEL];

export const getNodeArchitecture = (
  input: NodeKind | NodeKind[] | { architecture: string }[]
): string => {
  if (Array.isArray(input)) {
    if (input.length === 0) return '';
    const firstNode = input[0];
    // Check if the node has architecture property directly (WizardNodeState)
    if ('architecture' in firstNode) {
      return firstNode.architecture;
    }
    // Otherwise extract from NodeKind structure
    return _.get(firstNode, 'status.nodeInfo.architecture', '');
  }
  return _.get(input, 'status.nodeInfo.architecture', '');
};
