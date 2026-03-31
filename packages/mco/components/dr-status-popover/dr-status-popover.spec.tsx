/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import { DRPlacementControlConditionReason, Phase } from '@odf/mco/types';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DRStatusPopover, { DRStatusProps } from './dr-status-popover';

type ScenarioOverrides = Partial<DRStatusProps>;

type Scenario = {
  label: string;
  expectedStatus: string;
  overrides: ScenarioOverrides;
};

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
    phase: Phase.Relocated,
    isCleanupRequired: false,
    isLoadedWOError: true,
  };

  const healthyStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: Phase.Deployed,
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
    phase: Phase.Deployed,
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
    phase: Phase.FailingOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const relocateStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: Phase.Relocating,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const failoverCompleteStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: Phase.FailedOver,
    primaryCluster: 'primary-cluster',
    targetCluster: 'target-cluster',
    policyName: '',
    schedulingInterval: '',
    volumeLastGroupSyncTime: '',
    volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
  };

  const relocateCompleteStatus: DRStatusProps = {
    isLoadedWOError: true,
    phase: Phase.Relocated,
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
      phase: Phase.Deployed, // Must be Deployed (not Relocated/FailedOver) for Protecting to show
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
      phase: Phase.FailedOver,
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

  it('renders Protection Error when protected condition is Error in Relocated phase after sync starts', async () => {
    const relocatedProtectionError: DRStatusProps = {
      isLoadedWOError: true,
      phase: Phase.Relocated,
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
      <DRStatusPopover disasterRecoveryStatus={relocatedProtectionError} />
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
      phase: Phase.FailedOver,
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
      phase: Phase.Relocated,
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
      phase: Phase.FailedOver,
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
    const baseScenario: DRStatusProps = {
      isLoadedWOError: true,
      phase: Phase.Deployed,
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
        label: 'FailingOver - FailingOver',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'FailingOver',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailingOver - CheckingFailoverPrerequisites',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'CheckingFailoverPrerequisites',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailingOver - WaitForFencing',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'WaitForFencing',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailingOver - UpdatedPlacement',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'UpdatedPlacement',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailingOver - FailingOverToCluster',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'FailingOverToCluster',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailingOver - WaitingForResourceRestore',
        expectedStatus: 'FailingOver',
        overrides: {
          phase: Phase.FailingOver,
          progression: 'WaitingForResourceRestore',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailedOver - WaitForReadiness',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'WaitForReadiness',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailedOver - WaitOnUserToCleanUp',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'WaitOnUserToCleanUp',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'FailedOver no sync - success',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.True,
            reason: DRPlacementControlConditionReason.Success,
          },
        },
      },
      {
        label: 'FailedOver no sync - unknown',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        label: 'FailedOver no sync - error',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'FailedOver sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        label: 'FailedOver sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        label: 'FailedOver sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        label: 'FailedOver sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'FailedOver sync warning + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'FailedOver sync critical + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'FailedOver progression active (EnsuringVolSyncSetup)',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'EnsuringVolSyncSetup',
        },
      },
      {
        label: 'FailedOver progression active (WaitingForResourceRestore)',
        expectedStatus: 'FailedOver',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'WaitingForResourceRestore',
        },
      },
      {
        label: 'FailedOver cleanup required',
        expectedStatus: 'WaitOnUserToCleanUp',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'WaitOnUserToCleanUp',
          isCleanupRequired: true,
        },
      },
      {
        label: 'Relocating - Relocating',
        expectedStatus: 'Relocating',
        overrides: {
          phase: Phase.Relocating,
          progression: 'Relocating',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'Relocated - CleaningUp',
        expectedStatus: 'Relocated',
        overrides: {
          phase: Phase.Relocated,
          progression: 'CleaningUp',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'Relocating - ClearingPlacement',
        expectedStatus: 'Relocating',
        overrides: {
          phase: Phase.Relocating,
          progression: 'ClearingPlacement',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'Relocating cleanup required',
        expectedStatus: 'WaitOnUserToCleanUp',
        overrides: {
          phase: Phase.Relocating,
          progression: 'WaitOnUserToCleanUp',
          isCleanupRequired: true,
        },
      },
      {
        label: 'Relocated no sync',
        expectedStatus: 'Relocated',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
        },
      },
      {
        label: 'Relocated sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        label: 'Relocated sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        label: 'Relocated sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        label: 'Relocated sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'Relocated sync warning + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.Relocated,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'Deploying unknown',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Deploying,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        label: 'Deploying unknown/progressing',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Deploying,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        label: 'Deploying progressing false',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Deploying,
          progression: 'Deploying',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        label: 'Deploying error false -> protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.Deploying,
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
        label: 'Deployed unknown progressing -> health-based',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Deployed,
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
        label: 'Deployed progressing false -> health-based',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Deployed,
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
        label: 'Deployed error false -> protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.Deployed,
          progression: 'Completed',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'Deployed success true -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.Deployed,
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
        label: 'Deployed sync healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: Phase.Deployed,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        label: 'Deployed sync warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: Phase.Deployed,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        label: 'Deployed sync critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.Deployed,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        label: 'Deployed sync healthy + protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.Deployed,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'Initiating unknown -> protecting',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Initiating,
          progression: 'Initial',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        label: 'Initiating unknown/progressing -> protecting',
        expectedStatus: 'Protecting',
        overrides: {
          phase: Phase.Initiating,
          progression: 'Initial',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Progressing,
          },
        },
      },
      {
        label: 'Initiating error false -> health-based',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.Initiating,
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
        label: 'WaitForUser with protection error (progression active)',
        expectedStatus: 'Action needed',
        overrides: {
          phase: Phase.WaitForUser,
          progression: 'Any',
          volumeLastGroupSyncTime: noSync,
          availableCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
            message: 'Operation Paused - User Intervention Required',
          },
          protectedCondition: {
            status: K8sResourceConditionStatus.False,
            reason: DRPlacementControlConditionReason.Error,
          },
        },
      },
      {
        label: 'Deleting with protecting',
        expectedStatus: 'Deleting',
        overrides: {
          phase: Phase.Deleting,
          progression: 'Deleting',
          volumeLastGroupSyncTime: noSync,
          protectedCondition: {
            status: K8sResourceConditionStatus.Unknown,
            reason: DRPlacementControlConditionReason.Unknown,
          },
        },
      },
      {
        label: 'Multi-component healthy',
        expectedStatus: 'Healthy',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          kubeObjectReplicationHealth: VolumeReplicationHealth.HEALTHY,
        },
      },
      {
        label: 'Multi-component warning',
        expectedStatus: 'Warning',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.HEALTHY,
          kubeObjectReplicationHealth: VolumeReplicationHealth.WARNING,
        },
      },
      {
        label: 'Multi-component critical',
        expectedStatus: 'Critical',
        overrides: {
          phase: Phase.FailedOver,
          progression: 'Completed',
          volumeReplicationHealth: VolumeReplicationHealth.WARNING,
          kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
        },
      },
      {
        label: 'Multi-component protection error',
        expectedStatus: 'ProtectionError',
        overrides: {
          phase: Phase.FailedOver,
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

    scenarios.forEach(({ expectedStatus, overrides }) => {
      const props = { ...baseScenario, ...overrides };
      const { unmount } = render(
        <DRStatusPopover disasterRecoveryStatus={props} />
      );
      const buttonText =
        screen.getByTestId('dr-status-button').textContent?.toLowerCase() || '';
      expect(buttonText).toContain(expectedStatus.toLowerCase());
      unmount();
    });
  });
});
