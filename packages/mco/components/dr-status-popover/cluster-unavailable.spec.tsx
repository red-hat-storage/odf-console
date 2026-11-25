/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { DRActionType, VolumeReplicationHealth } from '@odf/mco/constants';
import { Phase, Progression } from '@odf/mco/types';
import { DRStatus, getDRStatus } from '@odf/mco/utils/dr-status';
import { K8sResourceConditionStatus } from '@odf/shared/types';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { NodeStatus } from '@patternfly/react-topology';
import { DecoratorIcon } from '../topology/types';
import { getDecoratorForStatus } from '../topology/utils/decorator-helpers';
import { getDRNodeStatus } from '../topology/utils/sidebar-utils';
import DRStatusPopover, { DRStatusProps } from './dr-status-popover';

jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name) => vars?.[name] ?? `{{${name}}}`),
  }),
}));

const staleSync = '2020-01-01T00:00:00Z';

const downHealth = {
  schedulingInterval: '5m',
  volumeLastGroupSyncTime: staleSync,
  volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
  kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
  isCleanupRequired: false,
  isLoadedWOError: true,
  policyName: 'policy-1',
  primaryCluster: 'primary-cluster',
  targetCluster: 'target-cluster',
};

const statusFor = (overrides: Parameters<typeof getDRStatus>[0]): DRStatus =>
  getDRStatus(overrides);

describe('cluster down during failover and relocate', () => {
  const cases: Array<{
    label: string;
    phase: Phase;
    progression: string;
    action?: DRActionType;
    cleanup?: boolean;
    protectionError?: boolean;
    expected: DRStatus;
    node: NodeStatus;
    icon: DecoratorIcon;
    decoratorStatus: NodeStatus;
  }> = [
    {
      label: 'primary down, failover still fencing',
      phase: Phase.FailingOver,
      progression: 'WaitForFencing',
      action: DRActionType.FAILOVER,
      expected: DRStatus.FailingOver,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label: 'target down, failover still deploying',
      phase: Phase.FailingOver,
      progression: 'FailingOverToCluster',
      action: DRActionType.FAILOVER,
      expected: DRStatus.FailingOver,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label:
        'either cluster down after phase FailedOver, cleanup still running',
      phase: Phase.FailedOver,
      progression: Progression.CleaningUp,
      action: DRActionType.FAILOVER,
      expected: DRStatus.FailingOver,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label: 'either cluster down during EnsuringVolSyncSetup',
      phase: Phase.FailedOver,
      progression: 'EnsuringVolSyncSetup',
      action: DRActionType.FAILOVER,
      expected: DRStatus.FailingOver,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label: 'primary down, relocate still clearing placement',
      phase: Phase.Relocating,
      progression: 'ClearingPlacement',
      action: DRActionType.RELOCATE,
      expected: DRStatus.Relocating,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label: 'target down after phase Relocated, cleanup still running',
      phase: Phase.Relocated,
      progression: Progression.CleaningUp,
      action: DRActionType.RELOCATE,
      expected: DRStatus.Relocating,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label:
        'protection error during failover does not replace the in-progress status',
      phase: Phase.FailingOver,
      progression: 'WaitForFencing',
      action: DRActionType.FAILOVER,
      protectionError: true,
      expected: DRStatus.FailingOver,
      node: NodeStatus.info,
      icon: DecoratorIcon.InProgress,
      decoratorStatus: NodeStatus.info,
    },
    {
      label: 'operation finished and the peer is still down',
      phase: Phase.FailedOver,
      progression: Progression.Completed,
      action: DRActionType.FAILOVER,
      expected: DRStatus.Critical,
      node: NodeStatus.danger,
      icon: DecoratorIcon.ExclamationCircle,
      decoratorStatus: NodeStatus.danger,
    },
    {
      label: 'operation finished with a real protection error',
      phase: Phase.FailedOver,
      progression: Progression.Completed,
      action: DRActionType.FAILOVER,
      protectionError: true,
      expected: DRStatus.ProtectionError,
      node: NodeStatus.danger,
      icon: DecoratorIcon.ExclamationCircle,
      decoratorStatus: NodeStatus.danger,
    },
    {
      label: 'relocate finished and the peer is still down',
      phase: Phase.Relocated,
      progression: Progression.Completed,
      action: DRActionType.RELOCATE,
      expected: DRStatus.Critical,
      node: NodeStatus.danger,
      icon: DecoratorIcon.ExclamationCircle,
      decoratorStatus: NodeStatus.danger,
    },
  ];

  it.each(cases)(
    '$label stays $expected',
    ({
      phase,
      progression,
      action,
      cleanup,
      protectionError,
      expected,
      node,
      icon,
      decoratorStatus,
    }) => {
      const status = statusFor({
        phase,
        progression,
        action,
        isCleanupRequired: cleanup,
        volumeReplicationHealth: VolumeReplicationHealth.CRITICAL,
        kubeObjectReplicationHealth: VolumeReplicationHealth.CRITICAL,
        volumeLastGroupSyncTime: staleSync,
        schedulingInterval: '5m',
        protectedCondition: protectionError
          ? {
              status: K8sResourceConditionStatus.False,
              reason: 'Error',
            }
          : undefined,
      });
      const decorator = getDecoratorForStatus(status);
      expect(status).toBe(expected);
      expect(getDRNodeStatus(status)).toBe(node);
      expect(decorator.icon).toBe(icon);
      expect(decorator.status).toBe(decoratorStatus);
    }
  );
});

describe('cluster down popover', () => {
  const open = async (status: DRStatusProps) => {
    render(<DRStatusPopover disasterRecoveryStatus={status} />);
    await userEvent.click(screen.getByTestId('dr-status-button'));
  };

  it('keeps the failover title while the primary is down and fencing', async () => {
    await open({
      ...downHealth,
      phase: Phase.FailingOver,
      progression: 'WaitForFencing',
      action: DRActionType.FAILOVER,
    });
    expect(screen.getByTestId('dr-status-button')).toHaveTextContent(
      'FailingOver'
    );
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Failing over application to target-cluster'
    );
    expect(
      screen.queryByText('Volumes are not syncing')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Failover complete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cluster-details')).not.toBeInTheDocument();
  });

  it('names the new cluster while cleanup runs and the old cluster is down', async () => {
    await open({
      ...downHealth,
      phase: Phase.FailedOver,
      progression: Progression.CleaningUp,
      action: DRActionType.FAILOVER,
    });
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Failing over application to primary-cluster'
    );
    expect(screen.getByLabelText('Clean up (in progress)')).toBeInTheDocument();
    expect(screen.queryByText('Failover complete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cluster-details')).not.toBeInTheDocument();
  });

  it('keeps relocating while the target is down', async () => {
    await open({
      ...downHealth,
      phase: Phase.Relocated,
      progression: Progression.CleaningUp,
      action: DRActionType.RELOCATE,
    });
    expect(screen.getByTestId('dr-status-button')).toHaveTextContent(
      'Relocating'
    );
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Relocating application to primary-cluster'
    );
    expect(screen.queryByText('Relocation complete')).not.toBeInTheDocument();
  });

  it('shows critical only after the operation has finished', async () => {
    await open({
      ...downHealth,
      phase: Phase.FailedOver,
      progression: Progression.Completed,
      action: DRActionType.FAILOVER,
    });
    expect(screen.getByTestId('dr-status-button')).toHaveTextContent(
      VolumeReplicationHealth.CRITICAL
    );
    expect(screen.getByTestId('popover-header')).toHaveTextContent(
      'Volumes & Kubernetes resources are not syncing'
    );
    expect(
      screen.queryByText(/Failing over application/)
    ).not.toBeInTheDocument();
  });
});
