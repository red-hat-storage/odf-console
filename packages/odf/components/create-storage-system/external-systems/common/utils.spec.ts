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
  it('should return floor values when 5% of the lowest node spec is below the floor', () => {
    const nodes = [
      makeNode('4', '8Gi', 'node-1'),
      makeNode('4', '8Gi', 'node-2'),
      makeNode('4', '8Gi', 'node-3'),
    ];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    // min cpu = 4, 4 * 0.05 = 0.2 → ceil → 1, floor → 2
    expect(cpuRequest).toBe(2);
    // min memory = 8Gi, 8Gi * 0.05 ≈ 0.4Gi, floor → 6Gi
    expect(memoryRequest).toBe('6Gi');
  });

  it('should return 5% of the lowest node spec when it exceeds the floor', () => {
    const nodes = [
      makeNode('200', '200Gi', 'node-1'),
      makeNode('300', '400Gi', 'node-2'),
      makeNode('250', '300Gi', 'node-3'),
    ];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    // min cpu = 200, 200 * 0.05 = 10
    expect(cpuRequest).toBe(10);
    // min memory = 200Gi, 200Gi * 0.05 = 10Gi
    expect(memoryRequest).toBe('10Gi');
  });

  it('should return floor values for an empty node list', () => {
    const { cpuRequest, memoryRequest } = getOptimalResourceRequests([]);

    expect(cpuRequest).toBe(2);
    expect(memoryRequest).toBe('6Gi');
  });

  it('should handle a single node', () => {
    const nodes = [makeNode('2', '4Gi')];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    expect(cpuRequest).toBe(2);
    expect(memoryRequest).toBe('6Gi');
  });

  it('should use the lowest-spec node in a heterogeneous cluster', () => {
    const nodes = [
      makeNode('200', '256Gi', 'large'),
      makeNode('48', '128Gi', 'small'),
      makeNode('96', '192Gi', 'medium'),
    ];

    const { cpuRequest, memoryRequest } = getOptimalResourceRequests(nodes);

    // min cpu = 48, 48 * 0.05 = 2.4 → ceil → 3
    expect(cpuRequest).toBe(3);
    // min memory = 128Gi, 128Gi * 0.05 = 6.4Gi
    expect(memoryRequest).toBe('6.4Gi');
  });
});
