import { NodeData } from '@odf/core/types';
import { NodeKind } from '@odf/shared';

export const createFakeNodesData = (
  amount: number,
  cpu: number,
  metricMemory?: number,
  memory?: number
): NodeData[] =>
  Array.from(
    Array(amount),
    (_, index): NodeData => ({
      spec: {},
      status: {
        capacity: { cpu: String(cpu), memory: String(memory) },
      },
      metadata: { name: `node-name-${index}`, uid: `node-uid-${index}` },
      metrics: { memory: String(metricMemory) },
    })
  );

export const createFakeNodes = (
  amount: number,
  cpu: number,
  memory: number
): NodeKind[] =>
  Array.from(
    Array(amount),
    (_, index): NodeKind => ({
      spec: {},
      status: {
        capacity: { cpu: String(cpu), memory: String(memory) },
      },
      metadata: { name: `node-name-${index}`, uid: `node-uid-${index}` },
    })
  );
