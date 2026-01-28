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
      progression: 'Deploying',
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

  it('renders Protection Error when protected condition is Error in FailedOver phase after sync starts', async () => {
    const failedOverProtectionError: DRStatusProps = {
      isLoadedWOError: true,
      phase: DRPCStatus.FailedOver,
      primaryCluster: 'primary-cluster',
      targetCluster: 'target-cluster',
      policyName: 'policy-1',
      schedulingInterval: '5m',
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
      kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      progression: 'Completed',
      protectedCondition: {
        status: K8sResourceConditionStatus.False,
        reason: DRPlacementControlConditionReason.Error,
        message: 'VM protection validation failed.',
      },
    };

    render(
      <DRStatusPopover disasterRecoveryStatus={failedOverProtectionError} />
    );

    await userEvent.click(screen.getByTestId('dr-status-button'));
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Protection Error'
    );
    expect(screen.getByTestId('popover-description')).toHaveTextContent(
      'VM protection validation failed.'
    );
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

  it('validates DR Status for all defined scenarios', () => {
    type Scenario = {
      id: number;
      label: string;
      expectedStatus: string;
      overrides: Partial<DRStatusProps>;
    };

    const baseScenario: DRStatusProps = {
      isLoadedWOError: true,
      phase: 'Deployed' as DRPCStatus,
      primaryCluster: 'primary-cluster',
      targetCluster: 'target-cluster',
      policyName: 'policy-1',
      schedulingInterval: '5m',
      volumeLastGroupSyncTime: '2023-10-01T12:00:00Z',
      lastKubeObjectProtectionTime: '2023-10-01T12:00:00Z',
      volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
      kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
      progression: 'Completed',
      isCleanupRequired: false,
    };

    const noSync = '';
    const scenarios: Scenario[] = [
      {
        id: 1,
        label: 'FailingOver - FailingOver',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'FailingOver',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 2,
        label: 'FailingOver - CheckingFailoverPrerequisites',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'CheckingFailoverPrerequisites',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 3,
        label: 'FailingOver - WaitForFencing',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'WaitForFencing',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 4,
        label: 'FailingOver - RunningFinalSync',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'RunningFinalSync',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 5,
        label: 'FailingOver - FailingOverToCluster',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'FailingOverToCluster',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 6,
        label: 'FailingOver - WaitingForResourceRestore',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'WaitingForResourceRestore',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 7,
        label: 'FailingOver - WaitForReadiness',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'WaitForReadiness',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 8,
        label: 'FailingOver - WaitOnUserToCleanUp',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: DRPCStatus.FailingOver,
          progression: 'WaitOnUserToCleanUp',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 9,
        label: 'FailedOver no sync - success',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.True,
            reason: DRPlacementControlConditionReason.Success,
          },
        },
      },
      {
        id: 10,
        label: 'FailedOver no sync - unknown',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        id: 11,
        label: 'FailedOver no sync - error',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 12,
        label: 'FailedOver sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        id: 13,
        label: 'FailedOver sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        id: 14,
        label: 'FailedOver sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        id: 15,
        label: 'FailedOver sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 16,
        label: 'FailedOver sync warning + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 17,
        label: 'FailedOver sync critical + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 18,
        label: 'FailedOver progression active (EnsuringVolSyncSetup)',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'EnsuringVolSyncSetup',
        },
      },
      {
        id: 19,
        label: 'FailedOver progression active (WaitingForResourceRestore)',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'WaitingForResourceRestore',
        },
      },
      {
        id: 20,
        label: 'FailedOver cleanup required',
        expectedStatus: 'WaitOnUserToCleanUp',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'WaitOnUserToCleanUp',
          isCleanupRequired: true,
        },
      },
      {
        id: 21,
        label: 'Relocating - Relocating',
        expectedStatus: 'Relocating',
        overrides: {
          phase: DRPCStatus.Relocating,
          progression: 'Relocating',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 22,
        label: 'Relocating - CleaningUp',
        expectedStatus: 'Relocating',
        overrides: {
          phase: DRPCStatus.Relocating,
          progression: 'CleaningUp',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 23,
        label: 'Relocating - ClearingPlacement',
        expectedStatus: 'Relocating',
        overrides: {
          phase: DRPCStatus.Relocating,
          progression: 'ClearingPlacement',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 24,
        label: 'Relocating cleanup required',
        expectedStatus: 'WaitOnUserToCleanUp',
        overrides: {
          phase: DRPCStatus.Relocating,
          progression: 'WaitOnUserToCleanUp',
          isCleanupRequired: true,
        },
      },
      {
        id: 25,
        label: 'Relocated no sync',
        expectedStatus: 'Relocated',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        id: 26,
        label: 'Relocated sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        id: 27,
        label: 'Relocated sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        id: 28,
        label: 'Relocated sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        id: 29,
        label: 'Relocated sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 30,
        label: 'Relocated sync warning + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 31,
        label: 'Deploying unknown',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Deploying' as DRPCStatus,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        id: 32,
        label: 'Deploying unknown/progressing',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Deploying' as DRPCStatus,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        id: 33,
        label: 'Deploying progressing false',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Deploying' as DRPCStatus,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        id: 34,
        label: 'Deploying error false -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: 'Deploying' as DRPCStatus,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 35,
        label: 'Deployed unknown progressing -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        id: 36,
        label: 'Deployed progressing false -> health-based',
        expectedStatus: 'Warning',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        id: 37,
        label: 'Deployed error false -> protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 38,
        label: 'Deployed success true -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.True,
            reason: DRPlacementControlConditionReason.Success,
          },
        },
      },
      {
        id: 39,
        label: 'Deployed sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        id: 40,
        label: 'Deployed sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        id: 41,
        label: 'Deployed sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        id: 42,
        label: 'Deployed sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: 'Deployed' as DRPCStatus,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 43,
        label: 'Initiating unknown -> protecting',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Initiating' as DRPCStatus,
          progression: 'Initial',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        id: 44,
        label: 'Initiating unknown/progressing -> protecting',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Initiating' as DRPCStatus,
          progression: 'Initial',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        id: 45,
        label: 'Initiating error false -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: 'Initiating' as DRPCStatus,
          progression: 'Initial',
          volumeLastGroupSyncTime: noSync,
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 46,
        label: 'WaitForUser with protection error (progression active)',
        expectedStatus: 'Healthy',
        overrides: {
          phase: 'WaitForUser' as DRPCStatus,
          progression: 'Any',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        id: 47,
        label: 'Deleting with protecting',
        expectedStatus: 'Protecting',
        overrides: {
          phase: 'Deleting' as DRPCStatus,
          progression: 'Deleting',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        id: 48,
        label: 'Multi-component healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        id: 49,
        label: 'Multi-component warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        id: 50,
        label: 'Multi-component critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        id: 51,
        label: 'Multi-component protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: DRPCStatus.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
    ];

    scenarios.forEach(({ id, label, expectedStatus, overrides }) => {
      const props = { ...baseScenario, ...overrides };
      const { unmount } = render(
        <DRStatusPopover disasterRecoveryStatus={props} />
      );
      const buttonText =
        screen.getByTestId('dr-status-button').textContent?.toLowerCase() || '';
      if (!buttonText.includes(expectedStatus.toLowerCase())) {
        throw new Error(
          `Scenario ${id} (${label}) expected "${expectedStatus}" but got "${buttonText}"`
        );
      }
      unmount();
    });
  });
});
