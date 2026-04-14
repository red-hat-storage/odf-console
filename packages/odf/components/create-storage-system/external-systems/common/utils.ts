import {
  convertToBaseValue,
  humanizeBinaryBytesWithoutB,
} from '@odf/shared/utils';
import { WizardNodeState } from '../../reducer';

const MIN_CPU_REQUEST = 2;
const MIN_MEMORY_REQUEST_IN_BYTES = 6 * 1024 ** 3; // 6 Gi
const RESOURCE_FRACTION = 0.05;

export const getOptimalResourceRequests = (nodes: WizardNodeState[]) => {
  const minCpu =
    nodes?.length > 0
      ? Math.min(...nodes.map((node) => parseInt(node.cpu, 10) || 0))
      : 0;
  const minMemory =
    nodes?.length > 0
      ? Math.min(
          ...nodes.map((node) => Number(convertToBaseValue(node.memory)) || 0)
        )
      : 0;

  const cpuRequest = Math.max(
    Math.ceil(minCpu * RESOURCE_FRACTION),
    MIN_CPU_REQUEST
  );
  const memoryRequest = humanizeBinaryBytesWithoutB(
    Math.max(
      Math.ceil(minMemory * RESOURCE_FRACTION),
      MIN_MEMORY_REQUEST_IN_BYTES
    )
  ).string.replace(/\s/g, '');

  return {
    cpuRequest,
    memoryRequest,
  };
};
