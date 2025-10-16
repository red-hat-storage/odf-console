import { createFakeNodesData } from '../../../jest/helpers';
import { getNodeTotalMemory } from './ocs';

describe('getNodeTotalMemory', () => {
  it('returns node memory from metric by default', () => {
    const metricMemory = 32;
    const memory = 8;
    const node = createFakeNodesData(1, 12, metricMemory, memory)[0];

    expect(getNodeTotalMemory(node)).toEqual(String(metricMemory));
  });

  it('returns node CR memory when no metric', () => {
    const metricMemory = undefined;
    const memory = 8;
    const node = createFakeNodesData(1, 12, metricMemory, memory)[0];

    expect(getNodeTotalMemory(node)).toEqual(String(memory));
  });
});
