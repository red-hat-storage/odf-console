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

const reviewState = (
  overrides: Partial<DRPolicyState> = {}
): DRPolicyState => ({
  ...drPolicyInitialState,
  policyName: 'test-policy',
  replicationType: ReplicationType.ASYNC,
  selectedClusters: [
    { name: 'east-1' },
    { name: 'west-1' },
  ] as DRPolicyState['selectedClusters'],
  ...overrides,
});

describe('ReviewDRPolicyStep storage backend', () => {
  it('shows Data Foundation when that backend is selected', () => {
    render(
      <ReviewDRPolicyStep
        state={reviewState({ replicationBackend: BackendType.DataFoundation })}
      />
    );

    expect(screen.getByText('Storage backend')).toBeInTheDocument();
    expect(screen.getByText('Data Foundation')).toBeInTheDocument();
  });

  it('shows Third-party storage when that backend is selected', () => {
    render(
      <ReviewDRPolicyStep
        state={reviewState({
          replicationBackend: BackendType.ThirdParty,
          cluster1S3Details: {
            ...drPolicyInitialState.cluster1S3Details,
            s3ProfileName: 'profile-1',
          },
          cluster2S3Details: {
            ...drPolicyInitialState.cluster2S3Details,
            s3ProfileName: 'profile-2',
          },
        })}
      />
    );

    expect(screen.getByText('Storage backend')).toBeInTheDocument();
    expect(screen.getByText('Third-party storage')).toBeInTheDocument();
  });
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
        state={reviewState({ replicationBackend: BackendType.DataFoundation })}
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
