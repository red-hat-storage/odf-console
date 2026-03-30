/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import { DRPlacementControlConditionReason } from '@odf/mco/types';
import { K8sResourceConditionStatus } from '@odf/shared/types';
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

  const healthyStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: 'Deployed' as DRPCStatus,
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
    kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  };

  const warningStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: 'Deployed' as DRPCStatus,
    volumeReplicationHealth: VolumeReplicationHealth.WARNING,
    kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: 'policy-1',
    schedulingInterval: '5m',
    volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
    lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
  };

  const failoverStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: DRPCStatus.FailingOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const relocateStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: DRPCStatus.Relocating,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const failoverCompleteStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: DRPCStatus.FailedOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const relocateCompleteStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: DRPCStatus.Relocated,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  it('renders Protecting when ConditionProtected is initializing', async () => {
    const protectingStatus: DRStatusProps = {
      ...baseStatus,
      phase: 'Deployed' as DRPCStatus, // Must be Deployed (not Relocated/FailedOver) for Protecting to show
      volumeLastGroupSyncTime: '', // No sync time - sync hasn't started yet
      protectedCondition: {
        status: K8sResourceConditionStatus.Unknown,
        reason: DRPlacementControlConditionReason.Unknown,
        message: 'Validating protection status.',
      },
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

  it('renders the popover with Healthy status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={healthyStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
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
      /Failing over application to/
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
      /Relocating application to/
    );
    expect(screen.getByTestId('popover-description')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Primary clusterprimary-cluster'
    );
    expect(screen.getByTestId('cluster-details')).toHaveTextContent(
      'Target clustertarget-cluster'
    );
  });

  it('renders Critical state when replication health is critical', async () => {
    const criticalStatus: DRStatusProps = {
      ...baseStatus,
      volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
      protectedCondition: {
        status: K8sResourceConditionStatus.True,
      },
    };

    render(<DRStatusPopover disasterRecoveryStatus={criticalStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));

    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Volumes are not syncing/
    );
  });

  it('renders the popover with Failover completed status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={failoverCompleteStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Failover complete'
    );
    expect(screen.getByTestId('popover-description')).toHaveTextContent(
      /Application is now running on/
    );
    expect(screen.getByTestId('cluster-details')).toBeInTheDocument();
  });

  it('renders the popover with Relocation completed status', async () => {
    render(<DRStatusPopover disasterRecoveryStatus={relocateCompleteStatus} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Relocation complete'
    );
    expect(screen.getByTestId('popover-description')).toHaveTextContent(
      /Application successfully relocated to/
    );
    expect(screen.getByTestId('cluster-details')).toBeInTheDocument();
  });

  it('shows Critical status when FailedOver phase has CRITICAL replication health', async () => {
    const failedOverWithCritical: DRStatusProps = {
      isLoadedWOError: true,
      phase: DRPCStatus.FailedOver,
      primaryCluster: 'primary-cluster',
      targetCluster: 'target-cluster',
      policyName: 'policy-1',
      schedulingInterval: '5m',
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
      kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      progression: 'Completed',
    };

    render(<DRStatusPopover disasterRecoveryStatus={failedOverWithCritical} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    // Should show Critical status, not "Failover complete"
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Volumes are not syncing/
    );
  });

  it('shows Critical status when Relocated phase has CRITICAL replication health', async () => {
    const relocatedWithCritical: DRStatusProps = {
      isLoadedWOError: true,
      phase: DRPCStatus.Relocated,
      primaryCluster: 'primary-cluster',
      targetCluster: 'target-cluster',
      policyName: 'policy-1',
      schedulingInterval: '5m',
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
      kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      progression: 'Completed',
    };

    render(<DRStatusPopover disasterRecoveryStatus={relocatedWithCritical} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    // Should show Critical status, not "Relocation complete"
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Volumes are not syncing/
    );
  });

  it('shows Warning status when FailedOver phase has WARNING replication health', async () => {
    const failedOverWithWarning: DRStatusProps = {
      isLoadedWOError: true,
      phase: DRPCStatus.FailedOver,
      primaryCluster: 'primary-cluster',
      targetCluster: 'target-cluster',
      policyName: 'policy-1',
      schedulingInterval: '5m',
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      volumeReplicationHealth: VolumeReplicationHealth.WARNING,
      kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      progression: 'Completed',
    };

    render(<DRStatusPopover disasterRecoveryStatus={failedOverWithWarning} />);

    await userEvent.click(screen.getByTestId('dr-status-button'));
    // Should show Warning status, not "Failover complete"
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      /Volumes are syncing slower than usual/
    );
  });
});
