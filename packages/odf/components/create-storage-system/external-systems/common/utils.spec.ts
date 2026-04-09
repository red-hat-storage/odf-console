import { getOptimalResourceRequests } from './utils';

function makeNode(cpu, memory, name = 'node') {
  return {
    name,
    hostName: name,
    cpu,
    memory,
    zone: '',
    rack: '',
    uid: `uid-${name}`,
    roles: [],
    labels: undefined,
    taints: [],
    architecture: 'amd64',
  };
}

describe('getOptimalResourceRequests', () => {
  it('should return minimum requests when 5% of total is below the floor', () => {
    const nodes = [
      makeNode('4', '8Gi', 'node-1'),
      makeNode('4', '8Gi', 'node-2'),
      makeNode('4', '8Gi', 'node-3'),
    ];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    expect(cpuRequest).toBe(2);
    expect(memoryRequest).toBe('6 Gi');
  });

  it('should return 5% of totals when they exceed the minimums', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode('8', '16Gi', `node-${i}`)
    );

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    expect(cpuRequest).toBe(4);
    expect(memoryRequest).toBe('8 Gi');
  });

  it('should return minimums for an empty node list', () => {
    const { cpuRequest, memoryRequest } = getOptimalResourceRequests([]);

    expect(cpuRequest).toBe(2);
    expect(memoryRequest).toBe('6 Gi');
  });

  it('should handle a single node', () => {
    const nodes = [makeNode('2', '4Gi')];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    expect(cpuRequest).toBe(2);
    expect(memoryRequest).toBe('6 Gi');
  });

  it('should ceil fractional CPU values', () => {
    const nodes = Array.from({ length: 50 }, (_, i) =>
      makeNode('1', '4Gi', `node-${i}`)
    );

    const { cpuRequest } = getOptimalResourceRequests(nodes);

    // 50 * 1 * 0.05 = 2.5 → ceil → 3
    expect(cpuRequest).toBe(3);
  });
});
