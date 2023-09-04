import { RACK_LABEL } from '../constants';
import { NodeKind } from '../types';
import { getProviderID, getRack } from './node';

describe('getProviderID', () => {
  it('should return empty string when providerID does not exist', () => {
    const node: NodeKind = { spec: {} };
    expect(getProviderID(node)).toBe('');
  });

  it('should return the providerID as it is', () => {
    const node: NodeKind = {
      spec: { providerID: 'aws:///us-east-1a/i-0c94941212fef1fe3' },
    };
    expect(getProviderID(node)).toBe(node.spec.providerID);
  });

  it('should return the providerID when the string has no separator', () => {
    const node: NodeKind = { spec: { providerID: 'aws' } };
    expect(getProviderID(node)).toBe('aws');
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
