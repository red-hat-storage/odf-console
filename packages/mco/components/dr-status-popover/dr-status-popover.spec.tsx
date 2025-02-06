import React from 'react';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DRStatusPopover from './dr-status-popover';
import { DRStatusProps } from './parsers/dr-parser-utils';

describe('DRStatusPopover Component', () => {
  const healthyStatus = {
    isLoaded: true,
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
    isLoaded: true,
    volumeReplicationHealth: VolumeReplicationHealth.WARNING,
    kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  } as DRStatusProps;

  const criticalStatus = {
    isLoaded: true,
    volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
    kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  } as DRStatusProps;

  const failoverStatus = {
    isLoaded: true,
    phase: DRPCStatus.FailingOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
  } as DRStatusProps;

  const relocateStatus = {
    isLoaded: true,
    phase: DRPCStatus.Relocating,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
  } as DRStatusProps;

  it('renders the popover with Healthy status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={healthyStatus} />);

    fireEvent.click(screen.getByTestId('dr-status-button'));

    await waitFor(() => {
      expect(screen.getByTestId('popover-header')).toHaveTextContent(
        'All volumes & Kubernetes objects are synced'
      );

      expect(
        screen.getByText(/Application volumes \(PVCs\):/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Kubernetes objects:/)).toBeInTheDocument();

      expect(
        screen.queryByTestId('popover-description')
      ).not.toBeInTheDocument();
    });
  });

  it('renders the popover with Warning status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={warningStatus} />);

    fireEvent.click(screen.getByTestId('dr-status-button'));

    await waitFor(() => {
      expect(screen.getByTestId('popover-header')).toHaveTextContent(
        'Volumes & Kubernetes objects are syncing slower than usual'
      );
      expect(screen.getByTestId('popover-description')).toBeInTheDocument();

      expect(
        screen.getByText(/Application volumes \(PVCs\):/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Kubernetes objects:/)).toBeInTheDocument();
    });
  });

  it('renders the popover with Critical status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={criticalStatus} />);

    fireEvent.click(screen.getByTestId('dr-status-button'));

    await waitFor(() => {
      expect(screen.getByTestId('popover-header')).toHaveTextContent(
        'Volumes & Kubernetes objects are not syncing'
      );
      expect(screen.getByTestId('popover-description')).toBeInTheDocument();

      expect(
        screen.getByText(/Application volumes \(PVCs\):/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Kubernetes objects:/)).toBeInTheDocument();
    });
  });

  it('renders the popover with FailingOver status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={failoverStatus} />);

    fireEvent.click(screen.getByTestId('dr-status-button'));

    await waitFor(() => {
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
  });

  it('renders the popover with Relocating status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={relocateStatus} />);

    fireEvent.click(screen.getByTestId('dr-status-button'));

    await waitFor(() => {
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
});
