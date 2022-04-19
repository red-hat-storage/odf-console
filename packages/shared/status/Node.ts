import { isNodeReady } from '../selectors';
import { NodeKind } from '../types';

export const nodeStatus = (node: NodeKind) =>
  isNodeReady(node) ? 'Ready' : 'Not Ready';
