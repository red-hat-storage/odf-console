import {
  CloudProviderNodeKind,
  NodeAddress,
  NodeKind,
  NodeMachineAndNamespace,
} from '@odf/shared/types';
import * as _ from 'lodash-es';

const NODE_ROLE_PREFIX = 'node-role.kubernetes.io/';

export const getCloudProviderID = (node: CloudProviderNodeKind) =>
  node.spec.providerID.split('://')?.[0] || '';

export const getCloudProviderNames = (providerNames) => {
  if (providerNames.length) {
    const displayNames =
      providerNames.length === 1
        ? providerNames[0]
        : `Hybrid (${providerNames.join(' , ')})`;
    return displayNames.replace(/aws/i, 'Amazon Web Services');
  }
  return '';
};

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
    (acc: string[], v: string, k: string) => {
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
