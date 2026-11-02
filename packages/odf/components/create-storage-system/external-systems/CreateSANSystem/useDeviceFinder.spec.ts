import { Toleration } from '@odf/shared/types';
import { buildDiscoveryRequestBody } from './useDeviceFinder';

const expectedNodeSelector = (hostnames: string[]) => ({
  nodeSelectorTerms: [
    {
      matchExpressions: [
        {
          key: 'kubernetes.io/hostname',
          operator: 'In',
          values: hostnames,
        },
      ],
    },
  ],
});

describe('buildDiscoveryRequestBody', () => {
  it('builds the hostname nodeSelector', () => {
    expect(buildDiscoveryRequestBody(['worker-1', 'worker-2'])).toEqual({
      nodeSelector: expectedNodeSelector(['worker-1', 'worker-2']),
    });
  });

  it('omits tolerations when none are provided', () => {
    expect(buildDiscoveryRequestBody(['worker-1'], [])).not.toHaveProperty(
      'tolerations'
    );
    // No second arg behaves like an empty list.
    expect(buildDiscoveryRequestBody(['worker-1'])).not.toHaveProperty(
      'tolerations'
    );
  });

  it('includes tolerations when provided', () => {
    const tolerations: Toleration[] = [
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
    ];

    expect(buildDiscoveryRequestBody(['worker-1'], tolerations)).toEqual({
      nodeSelector: expectedNodeSelector(['worker-1']),
      tolerations,
    });
  });
});
