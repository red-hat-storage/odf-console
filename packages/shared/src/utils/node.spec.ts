import { RACK_LABEL } from '../constants';
import { NodeKind } from '../types';
import { getCloudProviderID, getRack } from './node';

describe('getCloudProviderID', () => {
  it('should return empty string when providerID does not exist', () => {
    const node: NodeKind = { spec: {} };
    expect(getCloudProviderID(node)).toBe('');
  });

  it('should return the providerID when the string contains the separator', () => {
    const node: NodeKind = {
      spec: { providerID: 'aws:///us-east-1a/i-0c94941212fef1fe3' },
    };
    expect(getCloudProviderID(node)).toBe('aws');
  });

  it('should return the providerID when the string has no separator', () => {
    const node: NodeKind = { spec: { providerID: 'aws' } };
    expect(getCloudProviderID(node)).toBe('aws');
  });
});

describe('getRack function', () => {
  test('should return rack label if it exists', () => {
    const mockNode = {
      metadata: {
        labels: {
          [RACK_LABEL]: 'rack-123',
        },
      },
    };

    const result = getRack(mockNode);
    expect(result).toBe('rack-123');
  });

  test('should return undefined if rack label is not present', () => {
    const mockNode = {
      metadata: {
        labels: {},
      },
    };

    const result = getRack(mockNode);
    expect(result).toBeUndefined();
  });

  test('should handle missing labels', () => {
    const mockNode = {
      metadata: {},
    };

    const result = getRack(mockNode);
    expect(result).toBeUndefined();
  });
});
