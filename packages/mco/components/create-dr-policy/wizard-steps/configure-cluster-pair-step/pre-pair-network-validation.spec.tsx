import * as React from 'react';
import { GlobalnetStatus, SubmarinerStatus } from '@odf/mco/constants';
import type { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isPrePairValidationPassed } from '../../utils/step-validation';
import { PrePairNetworkValidation } from './pre-pair-network-validation';

const clusterNames = ['east-1', 'west-1'];

const validationState = (
  overrides: Partial<PrePairNetworkValidationState> = {}
): PrePairNetworkValidationState => ({
  loaded: true,
  loadError: null,
  canProceed: true,
  status: SubmarinerStatus.Healthy,
  globalnetStatus: GlobalnetStatus.Skipped,
  ...overrides,
});

const noAcmSubmariner = validationState({
  status: SubmarinerStatus.NotInstalled,
});

const unknownSubmariner = validationState({
  status: SubmarinerStatus.Unknown,
});

const renderValidation = (
  validation: PrePairNetworkValidationState,
  acknowledged = false,
  onAcknowledge: (value: boolean) => void = jest.fn()
) =>
  render(
    <PrePairNetworkValidation
      clusterNames={clusterNames}
      validation={validation}
      acknowledgedUnvalidatedSubmariner={acknowledged}
      onAcknowledgeUnvalidatedSubmariner={onAcknowledge}
      docHref="https://example.com/submariner"
    />
  );

describe('PrePairNetworkValidation acknowledgement', () => {
  it('warns and asks for an acknowledgement when neither cluster has the ACM add-on', () => {
    renderValidation(noAcmSubmariner);

    expect(
      screen.getByText(
        'ACM-managed Submariner addon was not detected on the selected clusters.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Submariner may not be installed on the selected clusters.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('If you understand the implications, you may continue.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'I understand that ACM-managed Submariner is not detected on the selected clusters and I want to continue.',
      })
    ).not.toBeChecked();
  });

  it('keeps Next disabled until the acknowledgement is checked', async () => {
    const onAcknowledge = jest.fn();
    renderValidation(noAcmSubmariner, false, onAcknowledge);
    expect(isPrePairValidationPassed(noAcmSubmariner, false)).toBe(false);

    await userEvent.click(screen.getByRole('checkbox'));

    expect(onAcknowledge).toHaveBeenCalledWith(true);
    expect(isPrePairValidationPassed(noAcmSubmariner, true)).toBe(true);
  });

  it('reflects an existing acknowledgement', () => {
    renderValidation(noAcmSubmariner, true);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('warns and asks for an acknowledgement when the status cannot be determined', () => {
    renderValidation(unknownSubmariner);

    expect(
      screen.getByText(
        'Submariner status could not be determined for the selected clusters.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The Submariner add-on did not report a complete status for the selected clusters, so the cluster network connection could not be verified. This does not necessarily mean the connection is unhealthy.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'I understand that the Submariner status could not be verified on the selected clusters and I want to continue.',
      })
    ).not.toBeChecked();
  });

  it('unlocks Next for an Unknown status only after the acknowledgement', async () => {
    const onAcknowledge = jest.fn();
    renderValidation(unknownSubmariner, false, onAcknowledge);
    expect(isPrePairValidationPassed(unknownSubmariner, false)).toBe(false);

    await userEvent.click(screen.getByRole('checkbox'));

    expect(onAcknowledge).toHaveBeenCalledWith(true);
    expect(isPrePairValidationPassed(unknownSubmariner, true)).toBe(true);
  });

  it('keeps Progressing a blocking status line with no acknowledgement', () => {
    const progressing = validationState({
      canProceed: false,
      status: SubmarinerStatus.Progressing,
    });
    renderValidation(progressing);

    expect(
      screen.getByText('Cluster network configuration in progress')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The Submariner add-on has not reported itself as available on the selected clusters yet. Wait until Submariner is available and healthy before you continue. This page updates on its own as the add-on reports progress.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('View documentation')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(isPrePairValidationPassed(progressing, true)).toBe(false);
  });

  it('shows no acknowledgement for a healthy pair', () => {
    renderValidation(
      validationState({ globalnetStatus: GlobalnetStatus.Enabled })
    );

    expect(screen.getByText('Submariner is healthy')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('blocks a mixed pair without offering an acknowledgement', () => {
    const inconsistent = validationState({
      canProceed: false,
      status: SubmarinerStatus.Inconsistent,
    });
    renderValidation(inconsistent);

    expect(
      screen.getByText('Inconsistent Submariner installation')
    ).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(isPrePairValidationPassed(inconsistent, true)).toBe(false);
  });
});

describe('PrePairNetworkValidation Globalnet section', () => {
  const noOverlapDescription =
    'No network overlap detected. Globalnet is not needed when the cluster networks do not overlap.';

  it.each([
    ['Globalnet is off on the broker', GlobalnetStatus.Disabled],
    ['the broker is missing', GlobalnetStatus.NotFound],
  ])(
    'reports Globalnet as not required when CIDRs do not overlap and %s',
    (_case, globalnetStatus) => {
      renderValidation(validationState({ globalnetStatus }));

      expect(screen.getByText('Not required')).toBeInTheDocument();
      expect(screen.getByText(noOverlapDescription)).toBeInTheDocument();
      // No overlap means Globalnet is irrelevant: no warning, nothing to read up on.
      expect(screen.queryByText('Not enabled')).not.toBeInTheDocument();
      expect(screen.queryByText('View documentation')).not.toBeInTheDocument();
    }
  );

  it.each([
    [GlobalnetStatus.OverlapGlobalnetOff],
    [GlobalnetStatus.OverlapBrokerMissing],
    [GlobalnetStatus.CidrUnread],
    [GlobalnetStatus.LoadError],
  ])('keeps %s a blocking "Not enabled" line', (globalnetStatus) => {
    const validation = validationState({ canProceed: false, globalnetStatus });
    renderValidation(validation);

    expect(screen.getByText('Not enabled')).toBeInTheDocument();
    expect(screen.queryByText('Not required')).not.toBeInTheDocument();
    expect(screen.getByText('View documentation')).toBeInTheDocument();
    expect(isPrePairValidationPassed(validation, true)).toBe(false);
  });

  it('keeps the enabled lines unchanged', () => {
    const { unmount } = renderValidation(
      validationState({ globalnetStatus: GlobalnetStatus.Enabled })
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(
      screen.getByText('Globalnet is on. Cluster networks do not overlap')
    ).toBeInTheDocument();
    unmount();

    renderValidation(
      validationState({ globalnetStatus: GlobalnetStatus.EnabledWithOverlap })
    );
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Globalnet is on. Cluster networks have overlapping Pod or Service CIDR.'
      )
    ).toBeInTheDocument();
  });

  it('hides the Globalnet section when the check is skipped', () => {
    renderValidation(
      validationState({ globalnetStatus: GlobalnetStatus.Skipped })
    );

    expect(screen.queryByText('Globalnet')).not.toBeInTheDocument();
  });
});
