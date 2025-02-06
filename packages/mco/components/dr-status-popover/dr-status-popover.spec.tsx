import React from 'react';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DRStatusPopover, { DRStatusProps } from './dr-status-popover';

describe('DRStatusPopover Component', () => {
  const healthyStatus = {
    isLoadedWOError: true,
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
    kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  } as DRStatusProps;

  const warningStatus = {
    isLoadedWOError: true,
    volumeReplicationHealth: VolumeReplicationHealth.WARNING,
    kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  } as DRStatusProps;

  const failoverStatus = {
    isLoadedWOError: true,
    phase: DRPCStatus.FailingOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
  } as DRStatusProps;

  const relocateStatus = {
    isLoadedWOError: true,
    phase: DRPCStatus.Relocating,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
  } as DRStatusProps;

  it('renders the popover with Healthy status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={healthyStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));

    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'All volumes & Kubernetes resources are synced'
    );
    expect(screen.queryByTestId('popover-description')).not.toBeInTheDocument();
  });

  it('renders the popover with Warning status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={warningStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Volumes & Kubernetes resources are syncing slower than usual'
    );
    expect(screen.getByTestId('popover-description')).toBeInTheDocument();
  });

  it('renders the popover with FailingOver status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={failoverStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Failover in progress'
    );
    expect(screen.getByTestId('popover-description')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Primary clusterprimary-cluster'
    );
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Target clustertarget-cluster'
    );
  });

  it('renders the popover with Relocating status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={relocateStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Relocate in progress'
    );
    expect(screen.getByTestId('popover-description')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Primary clusterprimary-cluster'
    );
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Target clustertarget-cluster'
    );
  });
});
