import * as React from 'react';
import { PrePairCheckId, StorageVendorId } from '@odf/mco/constants';
import { getDescriptorById } from '@odf/mco/utils/storage-vendor-registry';
import { render } from '@testing-library/react';
import { usePrePairChecks } from './pre-pair-checks-runner';

// Each fake check uses a different hook count, as the real checks do.
jest.mock('./pre-pair-checks', () => {
  const { useState } = jest.requireActual('react');
  const makeCheck = (id: string, hookCount: number, needsAck = false) => ({
    id,
    useCheck: ({ enabled }) => {
      for (let i = 0; i < hookCount; i++) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useState(i);
      }
      return { id, loaded: true, loadError: null, canProceed: enabled };
    },
    requiresAcknowledgement: () => needsAck,
    Render: () => null,
  });
  const checks = {
    [PrePairCheckId.OdfPrerequisites]: makeCheck(
      PrePairCheckId.OdfPrerequisites,
      1
    ),
    [PrePairCheckId.StorageClassCompatibility]: makeCheck(
      PrePairCheckId.StorageClassCompatibility,
      4
    ),
    [PrePairCheckId.Submariner]: makeCheck(PrePairCheckId.Submariner, 2, true),
  };
  return {
    getPrePairChecks: (descriptor) =>
      (descriptor?.prePairChecks ?? []).map((id) => checks[id]),
  };
});

type HarnessProps = {
  vendor: StorageVendorId.DataFoundation | StorageVendorId.Generic | null;
  acknowledgedChecks?: Set<string>;
  onPassed: (passed: boolean) => void;
};

const clusterNames = ['east-1', 'west-1'];

const Harness: React.FC<HarnessProps> = ({
  vendor,
  acknowledgedChecks = new Set(),
  onPassed,
}) => {
  const { probes, passed } = usePrePairChecks({
    descriptor: vendor ? getDescriptorById(vendor) : null,
    clusters: [],
    clusterNames,
    enabled: true,
    acknowledgedChecks,
  });
  onPassed(passed);
  return <>{probes}</>;
};

describe('usePrePairChecks', () => {
  it('keeps a stable hook order when the provider changes', () => {
    const onPassed = jest.fn();
    const { rerender } = render(<Harness vendor={null} onPassed={onPassed} />);
    expect(() => {
      rerender(<Harness vendor="data-foundation" onPassed={onPassed} />);
      rerender(<Harness vendor="generic" onPassed={onPassed} />);
      rerender(<Harness vendor="data-foundation" onPassed={onPassed} />);
    }).not.toThrow();
  });

  it('passes only once every check passes and is acknowledged', () => {
    const onPassed = jest.fn();
    const { rerender } = render(
      <Harness vendor="data-foundation" onPassed={onPassed} />
    );
    // Submariner requires acknowledgement.
    expect(onPassed).toHaveBeenLastCalledWith(false);

    rerender(
      <Harness
        vendor="data-foundation"
        acknowledgedChecks={new Set([PrePairCheckId.Submariner])}
        onPassed={onPassed}
      />
    );
    expect(onPassed).toHaveBeenLastCalledWith(true);
  });

  it('passes trivially for a provider without checks', () => {
    const onPassed = jest.fn();
    render(<Harness vendor="generic" onPassed={onPassed} />);
    expect(onPassed).toHaveBeenLastCalledWith(true);
  });
});
