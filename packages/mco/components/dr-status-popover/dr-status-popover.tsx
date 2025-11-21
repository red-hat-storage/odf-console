import * as React from 'react';
import {
  DRPCStatus,
  drStatusPopoverDocs,
  VolumeReplicationHealth,
  DRActionType,
} from '@odf/mco/constants';
import { Progression } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
import { DOC_VERSION as mcoDocVersion } from '@odf/shared/hooks';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { ViewDocumentation } from '@odf/shared/utils';
import { StatusIconAndText } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';
import {
  Button,
  ButtonVariant,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  Popover,
  Text,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { ProgressionTrainView } from './progression-train-view';
import './dr-status-popover.scss';

export type DRStatusProps = {
  policyName: string;
  schedulingInterval: string;
  primaryCluster: string;
  targetCluster: string;
  volumeLastGroupSyncTime: string;
  lastKubeObjectProtectionTime?: string;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth?: VolumeReplicationHealth;
  phase: DRPCStatus;
  isCleanupRequired?: boolean;
  isLoadedWOError: boolean;
  progression?: string;
  applicationName?: string;
  actionStartTime?: string;
  progressionDetails?: string[];
  action?: DRActionType;
};

enum DRStatus {
  WaitOnUserToCleanUp = Progression.WaitOnUserToCleanUp,
  FailingOver = DRPCStatus.FailingOver,
  Relocating = DRPCStatus.Relocating,
  FailedOver = DRPCStatus.FailedOver,
  Relocated = DRPCStatus.Relocated,
  Critical = VolumeReplicationHealth.CRITICAL,
  Warning = VolumeReplicationHealth.WARNING,
  Healthy = VolumeReplicationHealth.HEALTHY,
}

const shouldShowSyncDetails = ({
  status,
  volumeHealth,
  kubeHealth,
}: {
  status: DRStatus;
  volumeHealth: VolumeReplicationHealth;
  kubeHealth?: VolumeReplicationHealth;
}): boolean => {
  if ([DRStatus.Healthy, DRStatus.Warning, DRStatus.Critical].includes(status))
    return true;

  if ([DRStatus.FailedOver, DRStatus.Relocated].includes(status)) {
    const isHealthy =
      volumeHealth === VolumeReplicationHealth.HEALTHY &&
      (!kubeHealth || kubeHealth === VolumeReplicationHealth.HEALTHY);
    return !isHealthy;
  }

  return false;
};

const getStatusIcon = (status?: DRStatus): JSX.Element => {
  const iconMap = {
    [DRStatus.Critical]: <RedExclamationCircleIcon />,
    [DRStatus.Warning]: <YellowExclamationTriangleIcon />,
    [DRStatus.Healthy]: <GreenCheckCircleIcon />,
    [DRStatus.FailingOver]: <InProgressIcon />,
    [DRStatus.Relocating]: <InProgressIcon />,
    [DRStatus.FailedOver]: <GreenCheckCircleIcon />,
    [DRStatus.Relocated]: <GreenCheckCircleIcon />,
    [DRStatus.WaitOnUserToCleanUp]: <RedExclamationCircleIcon />,
  };

  return iconMap[status] ?? null;
};

const DescriptionItem: React.FC<{ term: string; description?: string }> = ({
  term,
  description,
}) => (
  <DescriptionListGroup>
    <DescriptionListTerm>{term}</DescriptionListTerm>
    <DescriptionListDescription>{description}</DescriptionListDescription>
  </DescriptionListGroup>
);

const ClusterDetails: React.FC<{
  primaryCluster: string;
  targetCluster: string;
  status: DRStatus;
}> = ({ primaryCluster, targetCluster, status }) => {
  const { t } = useCustomTranslation();

  return (
    <DescriptionList isCompact data-test-id="cluster-details">
      <DescriptionItem
        term={t('Primary cluster')}
        description={primaryCluster}
      />
      <DescriptionItem term={t('Target cluster')} description={targetCluster} />
      <DescriptionItem term={t('Status')} description={status} />
    </DescriptionList>
  );
};

const SyncDetails: React.FC<{
  volumeLastGroupSyncTime?: string;
  lastKubeObjectProtectionTime?: string;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth?: VolumeReplicationHealth;
}> = ({
  volumeLastGroupSyncTime,
  lastKubeObjectProtectionTime,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
}) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Text className="pf-v5-u-mt-md pf-v5-u-font-weight-bold">
        {t('Last synced on')}
      </Text>
      <SyncStatus
        label={t('Application volumes (PVCs):')}
        value={volumeLastGroupSyncTime && formatTime(volumeLastGroupSyncTime)}
        status={volumeReplicationHealth}
      />
      {lastKubeObjectProtectionTime && (
        <SyncStatus
          label={t('Kubernetes resources:')}
          value={formatTime(lastKubeObjectProtectionTime)}
          status={kubeObjectReplicationHealth}
        />
      )}
    </>
  );
};

const DRPolicyDetails: React.FC<{
  policyName: string;
  schedulingInterval?: string;
}> = React.memo(({ policyName, schedulingInterval }) => {
  const { t } = useCustomTranslation();

  return (
    <Text className="pf-v5-u-mt-md" data-test-id="dr-policy-details">
      <strong>{t('DR Policy:')}</strong>
      <br />
      {t('{{policyName}}, sync every {{schedulingInterval}}', {
        policyName,
        schedulingInterval: schedulingInterval || t('Unknown'),
      })}
    </Text>
  );
});

const SyncStatus: React.FC<{
  label: string;
  value?: string;
  status?: VolumeReplicationHealth;
}> = ({ label, value, status }) => {
  const { t } = useCustomTranslation();
  return (
    <StatusIconAndText
      title={t('{{ label }} {{ value }}', {
        label,
        value: value || t('No data available'),
      })}
      icon={getStatusIcon(status as any)}
    />
  );
};

const statusHelpLinks = (t: TFunction) => ({
  [DRStatus.Warning]: {
    href: drStatusPopoverDocs(mcoDocVersion).VOLUME_SYNC_DELAY,
    message: t('Documentation help link'),
  },
  [DRStatus.Critical]: {
    href: drStatusPopoverDocs(mcoDocVersion).VOLUME_SYNC_DELAY,
    message: t('Documentation help link'),
  },
  [DRStatus.FailingOver]: {
    href: drStatusPopoverDocs(mcoDocVersion).FAILOVER,
    message: t('Learn about different failover status'),
  },
  [DRStatus.Relocating]: {
    href: drStatusPopoverDocs(mcoDocVersion).RELOCATION,
    message: t('Learn about different relocate status'),
  },
  [DRStatus.FailedOver]: {
    href: drStatusPopoverDocs(mcoDocVersion).FAILOVER,
    message: t('Learn about different failover status'),
  },
  [DRStatus.Relocated]: {
    href: drStatusPopoverDocs(mcoDocVersion).RELOCATION,
    message: t('Learn about different relocate status'),
  },
  [DRStatus.WaitOnUserToCleanUp]: {
    href: drStatusPopoverDocs(mcoDocVersion).CLEANUP,
    message: t('How to clean up resources?'),
  },
});

const handleHealthStatus = ({
  status,
  volumeTitle,
  volumeMsg,
  kubeTitle,
  kubeMsg,
  bothTitle,
  bothMsg,
  t,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
}): StatusContent => {
  if (
    volumeReplicationHealth === status &&
    kubeObjectReplicationHealth === status
  ) {
    return {
      icon: getStatusIcon(status),
      title: t(bothTitle),
      message: t(bothMsg),
      className: `dr-status-${status.toLowerCase()}`,
      status,
    };
  }

  if (volumeReplicationHealth === status) {
    return {
      icon: getStatusIcon(status),
      title: t(volumeTitle),
      message: t(volumeMsg),
      className: `dr-status-${status.toLowerCase()}`,
      status,
    };
  }

  if (kubeObjectReplicationHealth === status) {
    return {
      icon: getStatusIcon(status),
      title: t(kubeTitle),
      message: t(kubeMsg),
      className: `dr-status-${status.toLowerCase()}`,
      status,
    };
  }

  return null;
};

const createStatus = (
  status: DRStatus,
  title: string,
  message: string | React.ReactNode,
  className: string
): StatusContent => ({
  icon: getStatusIcon(status),
  title,
  message,
  className,
  status,
});

const shouldShowActionStatus = ({
  phase,
  progression,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
}: {
  phase: DRPCStatus;
  progression?: Progression | string;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth?: VolumeReplicationHealth;
}): boolean => {
  const isCompleted = progression === Progression.Completed;
  const isHealthy =
    volumeReplicationHealth === VolumeReplicationHealth.HEALTHY &&
    (!kubeObjectReplicationHealth ||
      kubeObjectReplicationHealth === VolumeReplicationHealth.HEALTHY);

  if ([DRPCStatus.FailedOver, DRPCStatus.Relocated].includes(phase)) {
    return !(isCompleted && isHealthy);
  }

  return [DRPCStatus.FailingOver, DRPCStatus.Relocating].includes(phase);
};

const getDRStatus = ({
  isCleanupRequired,
  phase,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
  progression,
}: {
  isCleanupRequired: boolean;
  phase: DRPCStatus;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth: VolumeReplicationHealth;
  progression?: Progression | string;
}): DRStatus => {
  // Check if cleanup is required — this has the highest priority
  if (isCleanupRequired) return DRStatus.WaitOnUserToCleanUp;

  if (
    shouldShowActionStatus({
      phase,
      progression,
      volumeReplicationHealth,
      kubeObjectReplicationHealth,
    })
  ) {
    if (phase === DRPCStatus.FailingOver) return DRStatus.FailingOver;
    if (phase === DRPCStatus.Relocating) return DRStatus.Relocating;
    if (phase === DRPCStatus.FailedOver) return DRStatus.FailedOver;
    if (phase === DRPCStatus.Relocated) return DRStatus.Relocated;
  }

  // Combine health statuses into an array for easier checks
  const replicationHealths = [
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
  ];

  // If any health status is CRITICAL, return Critical status immediately
  if (replicationHealths.includes(VolumeReplicationHealth.CRITICAL))
    return DRStatus.Critical;

  // If any health status is WARNING, return Warning status
  if (replicationHealths.includes(VolumeReplicationHealth.WARNING))
    return DRStatus.Warning;

  // If at least one status is HEALTHY (and none were critical or warning), return Healthy status
  if (replicationHealths.includes(VolumeReplicationHealth.HEALTHY))
    return DRStatus.Healthy;

  // Fallback — assume Critical if no health statuses matched
  return DRStatus.Critical;
};

const getCleanupMessage = (
  phase: DRPCStatus,
  cluster: string,
  t: TFunction
) => {
  return phase === DRPCStatus.FailedOver
    ? t('Clean up application resources on failed cluster {{cluster}}.', {
        cluster,
      })
    : t(
        'Clean up application resources on the primary cluster {{cluster}} to start relocating.',
        { cluster }
      );
};

const getDRStatusDetails = ({
  isCleanupRequired,
  phase,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
  progression,
  t,
  primaryCluster,
  targetCluster,
}: {
  isCleanupRequired: boolean;
  phase: DRPCStatus;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth: VolumeReplicationHealth;
  progression?: Progression | string;
  t: TFunction;
  primaryCluster: string;
  targetCluster: string;
}): StatusContent => {
  const drStatus = getDRStatus({
    isCleanupRequired,
    phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
    progression,
  });

  switch (drStatus) {
    case DRStatus.Healthy: {
      const title = kubeObjectReplicationHealth
        ? t('All volumes & Kubernetes resources are synced')
        : t('All volumes are synced');
      return createStatus(DRStatus.Healthy, title, null, 'dr-status-healthy');
    }

    case DRStatus.Warning:
      return (
        handleHealthStatus({
          status: DRStatus.Warning,
          volumeTitle: 'Volumes are syncing slower than usual',
          volumeMsg:
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.',
          kubeTitle: 'Kubernetes resources are syncing slower than usual',
          kubeMsg:
            '1 or more Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.',
          bothTitle:
            'Volumes & Kubernetes resources are syncing slower than usual',
          bothMsg:
            '1 or more volumes & Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.',
          t,
          volumeReplicationHealth,
          kubeObjectReplicationHealth,
        }) ||
        createStatus(
          DRStatus.Healthy,
          t('Status unknown'),
          t('The current status could not be determined.'),
          'dr-status-unknown'
        )
      );

    case DRStatus.Critical:
      return (
        handleHealthStatus({
          status: DRStatus.Critical,
          volumeTitle: 'Volumes are not syncing',
          volumeMsg:
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.',
          kubeTitle: 'Kubernetes resources are not syncing',
          kubeMsg:
            '1 or more Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.',
          bothTitle: 'Volumes & Kubernetes resources are not syncing',
          bothMsg:
            '1 or more volumes & Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.',
          t,
          volumeReplicationHealth,
          kubeObjectReplicationHealth,
        }) ||
        createStatus(
          DRStatus.Critical,
          t('Status unknown'),
          t('The current status could not be determined.'),
          'dr-status-unknown'
        )
      );

    case DRStatus.WaitOnUserToCleanUp:
      return createStatus(
        DRStatus.WaitOnUserToCleanUp,
        t('Action needed'),
        getCleanupMessage(
          phase,
          phase === DRPCStatus.FailedOver ? targetCluster : primaryCluster,
          t
        ),
        'dr-status-action-needed'
      );

    case DRStatus.FailingOver:
      return createStatus(
        DRStatus.FailingOver,
        t('Failing over application to {{targetCluster}}', { targetCluster }),
        t('Deploying the application on the target cluster.'),
        'dr-status-failover'
      );

    case DRStatus.Relocating:
      return createStatus(
        DRStatus.Relocating,
        t('Relocating application to {{targetCluster}}', { targetCluster }),
        t('Deploying the application on the target cluster.'),
        'dr-status-relocating'
      );

    case DRStatus.FailedOver:
    case DRStatus.Relocated: {
      const isHealthy =
        volumeReplicationHealth === VolumeReplicationHealth.HEALTHY &&
        (!kubeObjectReplicationHealth ||
          kubeObjectReplicationHealth === VolumeReplicationHealth.HEALTHY);

      const detailMessage = !isHealthy
        ? t(
            'Replication health is {{health}}. Review sync details below for more information.',
            {
              health:
                volumeReplicationHealth === VolumeReplicationHealth.CRITICAL
                  ? t('Critical')
                  : t('Warning'),
            }
          )
        : null;

      const completionTitle =
        drStatus === DRStatus.FailedOver
          ? t('Failover complete')
          : t('Relocation complete');

      const completionMessage =
        drStatus === DRStatus.FailedOver
          ? t('Application is now running on {{targetCluster}}.', {
              targetCluster,
            })
          : t('Application successfully relocated to {{targetCluster}}.', {
              targetCluster,
            });

      return createStatus(
        drStatus,
        completionTitle,
        detailMessage ? (
          <>
            <Text>{completionMessage}</Text>
            <Text className="pf-v5-u-mt-sm">{detailMessage}</Text>
          </>
        ) : (
          completionMessage
        ),
        isHealthy ? 'dr-status-healthy' : 'dr-status-warning'
      );
    }

    default:
      return createStatus(
        DRStatus.Critical,
        t('Status unknown'),
        t('The current status could not be determined.'),
        'dr-status-unknown'
      );
  }
};

const DRStatusPopover: React.FC<DRStatusPopoverProps> = ({
  disasterRecoveryStatus,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { t } = useCustomTranslation();

  const { icon, title, message, className, status } = React.useMemo(
    () =>
      getDRStatusDetails({
        isCleanupRequired: disasterRecoveryStatus.isCleanupRequired,
        phase: disasterRecoveryStatus.phase,
        volumeReplicationHealth: disasterRecoveryStatus.volumeReplicationHealth,
        kubeObjectReplicationHealth:
          disasterRecoveryStatus.kubeObjectReplicationHealth,
        progression: disasterRecoveryStatus.progression,
        t,
        primaryCluster: disasterRecoveryStatus.primaryCluster,
        targetCluster: disasterRecoveryStatus.targetCluster,
      }),
    [disasterRecoveryStatus, t]
  );

  const togglePopover = () => {
    setIsVisible((prev) => !prev);
  };

  const statusLink = statusHelpLinks(t)[status];
  const cleanupDocHref = drStatusPopoverDocs(mcoDocVersion).CLEANUP;

  return (
    disasterRecoveryStatus.isLoadedWOError && (
      <Popover
        aria-label={t('DR status popover')}
        position="top"
        isVisible={isVisible}
        hasAutoWidth
        shouldClose={() => setIsVisible(false)}
        headerContent={
          <div
            className={`dr-status-popover__title ${className}`}
            data-test-id="popover-header"
          >
            <div className={`dr-status-popover__title-text ${className}`}>
              <StatusIconAndText title={title} icon={icon} />
            </div>
          </div>
        }
        bodyContent={
          <Flex
            direction={{ default: 'column' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            className="dr-status-popover__popover-body"
            data-test-id="popover-body"
          >
            {[DRStatus.FailingOver, DRStatus.Relocating].includes(status) &&
            disasterRecoveryStatus.progression &&
            disasterRecoveryStatus.action ? (
              <ProgressionTrainView
                action={disasterRecoveryStatus.action}
                currentProgression={disasterRecoveryStatus.progression}
                targetCluster={disasterRecoveryStatus.targetCluster}
                applicationName={
                  disasterRecoveryStatus.applicationName || 'Application'
                }
                actionStartTime={disasterRecoveryStatus.actionStartTime}
                progressionDetails={disasterRecoveryStatus.progressionDetails}
                isCleanupRequired={disasterRecoveryStatus.isCleanupRequired}
                primaryCluster={disasterRecoveryStatus.primaryCluster}
                learnMoreHref={cleanupDocHref}
              />
            ) : (
              <>
                {message && (
                  <Text
                    className="dr-status-popover__description"
                    data-test-id="popover-description"
                  >
                    {message}
                  </Text>
                )}
                {[
                  DRStatus.FailingOver,
                  DRStatus.Relocating,
                  DRStatus.FailedOver,
                  DRStatus.Relocated,
                ].includes(status) && (
                  <div className="dr-status-popover__cluster-details">
                    <ClusterDetails
                      primaryCluster={disasterRecoveryStatus.primaryCluster}
                      targetCluster={disasterRecoveryStatus.targetCluster}
                      status={status}
                    />
                  </div>
                )}
              </>
            )}

            {shouldShowSyncDetails({
              status,
              volumeHealth: disasterRecoveryStatus.volumeReplicationHealth,
              kubeHealth: disasterRecoveryStatus.kubeObjectReplicationHealth,
            }) && (
              <>
                <div className="dr-status-popover__sync-details">
                  <SyncDetails
                    volumeLastGroupSyncTime={
                      disasterRecoveryStatus.volumeLastGroupSyncTime
                    }
                    lastKubeObjectProtectionTime={
                      disasterRecoveryStatus.lastKubeObjectProtectionTime
                    }
                    volumeReplicationHealth={
                      disasterRecoveryStatus.volumeReplicationHealth
                    }
                    kubeObjectReplicationHealth={
                      disasterRecoveryStatus.kubeObjectReplicationHealth
                    }
                  />
                </div>
                <div className="dr-status-popover__policy-details">
                  <DRPolicyDetails
                    policyName={disasterRecoveryStatus.policyName}
                    schedulingInterval={
                      disasterRecoveryStatus.schedulingInterval
                    }
                  />
                </div>
              </>
            )}
            {statusLink && (
              <ViewDocumentation
                doclink={statusLink.href}
                text={statusLink.message}
                padding="0"
              />
            )}
          </Flex>
        }
      >
        <Button
          variant={ButtonVariant.link}
          isInline
          onClick={togglePopover}
          aria-label={t('Toggle DR status popover')}
          className="dr-status-popover__button"
          data-test-id="dr-status-button"
        >
          <StatusIconAndText title={status} icon={icon} />{' '}
        </Button>
      </Popover>
    )
  );
};

export default DRStatusPopover;

type DRStatusPopoverProps = {
  disasterRecoveryStatus: DRStatusProps;
};

type StatusContent = {
  icon: React.ReactElement | null;
  title: string;
  message?: string | React.ReactNode;
  className: string;
  status: DRStatus;
};
