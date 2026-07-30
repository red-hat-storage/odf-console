import { RACK_LABEL } from '../constants';
import { NodeKind } from '../types';
import {
  getProviderID,
  getRack,
  isOcsLabeledNode,
  OCS_CLUSTER_NODE_LABEL_PREFIX,
} from './node';

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

describe('isOcsLabeledNode', () => {
  it('should match any namespace under the OCS cluster label prefix', () => {
    expect(
      isOcsLabeledNode({
        labels: {
          [`${OCS_CLUSTER_NODE_LABEL_PREFIX}openshift-storage`]: '',
        },
      })
    ).toBe(true);
    expect(
      isOcsLabeledNode({
        labels: {
          [`${OCS_CLUSTER_NODE_LABEL_PREFIX}custom-ns`]: '',
        },
      })
    ).toBe(true);
  });

  it('should return false when no OCS cluster label is present', () => {
    expect(
      isOcsLabeledNode({
        labels: { 'node-role.kubernetes.io/worker': '' },
      })
    ).toBe(false);
    expect(isOcsLabeledNode({ labels: {} })).toBe(false);
    expect(isOcsLabeledNode({})).toBe(false);
  });
});
