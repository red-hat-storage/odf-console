import {
  convertToBaseValue,
  humanizeBinaryBytesWithoutB,
} from '@odf/shared/utils';
import { WizardNodeState } from '../../reducer';

const MIN_CPU_REQUEST = 2;
const MIN_MEMORY_REQUEST_IN_BYTES = 6 * 1024 ** 3; // 6 Gi
const RESOURCE_FRACTION = 0.05;

export const getOptimalResourceRequests = (nodes: WizardNodeState[]) => {
  const totalCpu = nodes.reduce((acc, node) => acc + parseInt(node.cpu, 10), 0);
  const totalMemory = nodes.reduce(
    (acc, node) => acc + (Number(convertToBaseValue(node.memory)) || 0),
    0
  );

  const cpuRequest = Math.max(
    Math.ceil(totalCpu * RESOURCE_FRACTION),
    MIN_CPU_REQUEST
  );
  const memoryRequest = humanizeBinaryBytesWithoutB(
    Math.max(
      Math.ceil(totalMemory * RESOURCE_FRACTION),
      MIN_MEMORY_REQUEST_IN_BYTES
    )
  ).string;

  return {
    cpuRequest,
    memoryRequest,
  };
};
