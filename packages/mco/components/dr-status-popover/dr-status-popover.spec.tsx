/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DRStatusPopover, { DRStatusProps } from './dr-status-popover';

describe('DRStatusPopover Component', () => {
  const baseStatus: DRStatusProps = {
    policyName: 'policy-1',
    schedulingInterval: '5m',
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
    kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
    phase: DRPCStatus.Relocated,
    isCleanupRequired: false,
    isLoadedWOError: true,
  };

  it('renders Protecting when ConditionProtected is initializing', async () => {
    const protectingStatus: DRStatusProps = {
      ...baseStatus,
      protectedConditionStatus: 'Unknown',
      protectedConditionReason: 'Unknown',
      protectedConditionMessage: 'Validating protection status.',
    };

    render(<DRStatusPopover disasterRecoveryStatus={protectingStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));

    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Protecting/
    );
    expect(screen.getByTestId('popover-description')).toHaveTextContent(
      /Validating protection status\./
    );
  });

  it('renders Critical state when replication health is critical', async () => {
    const criticalStatus: DRStatusProps = {
      ...baseStatus,
      volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
      protectedConditionStatus: 'True',
    };

    render(<DRStatusPopover disasterRecoveryStatus={criticalStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));

    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Volumes are not syncing/
    );
  });
});
