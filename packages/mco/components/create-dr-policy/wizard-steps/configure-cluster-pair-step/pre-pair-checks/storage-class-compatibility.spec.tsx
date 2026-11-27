import * as React from 'react';
import { useACMSafeFetch } from '@odf/mco/hooks/acm-safe-fetch';
import type { PrePairCheckResult } from '@odf/mco/utils/storage-vendor-registry';
import { render } from '@testing-library/react';
import { storageClassCompatibilityCheck } from './storage-class-compatibility';

jest.mock('@odf/mco/hooks/acm-safe-fetch', () => ({
  useACMSafeFetch: jest.fn(),
}));

const mockFetch = useACMSafeFetch as jest.Mock;
const clusterNames = ['east-1', 'west-1'];

const Harness: React.FC<{
  enabled: boolean;
  onResult: (result: PrePairCheckResult) => void;
}> = ({ enabled, onResult }) => {
  onResult(
    storageClassCompatibilityCheck.useCheck({
      clusters: [],
      clusterNames,
      enabled,
    })
  );
  return null;
};

describe('storage class compatibility check', () => {
  it('does not pass when the search failed after being disabled', () => {
    mockFetch.mockReturnValue([null, new Error('search is down'), true]);
    const onResult = jest.fn();
    // Disabled while the user is back on the Clusters step.
    const { rerender } = render(
      <Harness enabled={false} onResult={onResult} />
    );
    rerender(<Harness enabled onResult={onResult} />);

    expect(onResult).toHaveBeenLastCalledWith(
      expect.objectContaining({ loaded: true, canProceed: false })
    );
    expect(onResult.mock.lastCall[0].loadError).toEqual(
      new Error('search is down')
    );
  });
});
