import * as React from 'react';
import {
  BackendType,
  GlobalnetStatus,
  ReplicationType,
  SubmarinerStatus,
} from '@odf/mco/constants';
import type { PrePairNetworkValidationState } from '@odf/mco/hooks';
import { render, screen } from '@testing-library/react';
import { drPolicyInitialState, type DRPolicyState } from '../../utils/reducer';
import { ReviewDRPolicyStep } from './review-dr-policy-step';

type ReviewStateOverrides = {
  clusters?: Partial<DRPolicyState['clusters']>;
  configure?: Partial<DRPolicyState['configure']>;
  policy?: Partial<DRPolicyState['policy']>;
};

const reviewState = (overrides: ReviewStateOverrides = {}): DRPolicyState => ({
  clusters: {
    ...drPolicyInitialState.clusters,
    selectedClusters: [
      { name: 'east-1' },
      { name: 'west-1' },
    ] as DRPolicyState['clusters']['selectedClusters'],
    ...overrides.clusters,
  },
  configure: {
    ...drPolicyInitialState.configure,
    ...overrides.configure,
  },
  policy: {
    ...drPolicyInitialState.policy,
    policyName: 'test-policy',
    replicationType: ReplicationType.ASYNC,
    ...overrides.policy,
  },
});

describe('ReviewDRPolicyStep cluster pair summary', () => {
  const validation = (
    overrides: Partial<PrePairNetworkValidationState> = {}
  ): PrePairNetworkValidationState => ({
    loaded: true,
    loadError: null,
    canProceed: true,
    status: SubmarinerStatus.Healthy,
    globalnetStatus: GlobalnetStatus.Skipped,
    ...overrides,
  });

  const renderReview = (state: PrePairNetworkValidationState) =>
    render(
      <ReviewDRPolicyStep
        state={reviewState({
          configure: { replicationBackend: BackendType.DataFoundation },
        })}
        validation={state}
      />
    );

  it('confirms Submariner for a healthy pair', () => {
    renderReview(validation());

    expect(screen.getByText('Submariner enabled')).toBeInTheDocument();
  });

  // An acknowledged warning must not be summarised as a healthy pair.
  it('reports that the status could not be verified for an acknowledged Unknown pair', () => {
    renderReview(validation({ status: SubmarinerStatus.Unknown }));

    expect(
      screen.getByText(
        'Submariner status could not be verified on the selected clusters. You chose to continue.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Submariner enabled')).not.toBeInTheDocument();
  });

  it('reports the missing ACM add-on for an acknowledged NotInstalled pair', () => {
    renderReview(validation({ status: SubmarinerStatus.NotInstalled }));

    expect(
      screen.getByText(
        'ACM-managed Submariner was not detected on the selected clusters. You chose to continue.'
      )
    ).toBeInTheDocument();
  });
});
