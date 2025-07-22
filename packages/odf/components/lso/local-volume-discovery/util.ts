import { getLabel } from '@odf/shared';
import { NodeKind } from '@openshift-console/dynamic-plugin-sdk';

export const getNodesByHostNameLabel = (nodes: NodeKind[]): string[] =>
  nodes.map((node: NodeKind) => getLabel(node, 'kubernetes.io/hostname'));
