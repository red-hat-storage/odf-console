import { NodeKind } from '../types';
import { getCloudProviderID } from './node';

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
