import * as React from 'react';
import {
  drStatusPopoverDocs,
  VolumeReplicationHealth,
  DRActionType,
} from '@odf/mco/constants';
import { Phase } from '@odf/mco/types';
import {
  getDRStatus,
  isReplicationHealthy,
  isProgressionActive,
  DRStatus,
} from '@odf/mco/utils/dr-status';
import { formatTime } from '@odf/shared/details-page/datetime';
import { DOC_VERSION as mcoDocVersion } from '@odf/shared/hooks';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { K8sResourceCondition } from '@odf/shared/types';
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
  Content,
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
  phase: Phase;
  isCleanupRequired?: boolean;
  isLoadedWOError: boolean;
  progression?: string;
  applicationName?: string;
  actionStartTime?: string;
  progressionDetails?: string[];
  action?: DRActionType;
  isDiscoveredApp?: boolean;
  protectedCondition?: K8sResourceCondition;
  availableCondition?: K8sResourceCondition;
};

const DR_STATUS_CLASS_NAMES = {
  HEALTHY: 'dr-status-healthy',
  WARNING: 'dr-status-warning',
  CRITICAL: 'dr-status-critical',
  ACTION_NEEDED: 'dr-status-action-needed',
  FAILOVER: 'dr-status-failover',
  RELOCATING: 'dr-status-relocating',
  UNKNOWN: 'dr-status-unknown',
  PROTECTING: 'dr-status-protecting',
  PROTECTION_ERROR: 'dr-status-protection-error',
} as const;

const shouldShowSyncDetails = ({
  status,
  volumeHealth,
  kubeHealth,
  schedulingInterval,
}: {
  status: DRStatus;
  volumeHealth: VolumeReplicationHealth;
  kubeHealth?: VolumeReplicationHealth;
  schedulingInterval?: string;
}): boolean => {
  // No sync details to show when no replication is required (0m interval).
  if (schedulingInterval === '0m') return false;

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
    [DRStatus.WaitForUser]: <RedExclamationCircleIcon />,
    [DRStatus.Deleting]: <InProgressIcon />,
    [DRStatus.Protecting]: <InProgressIcon />,
    [DRStatus.ProtectionError]: <RedExclamationCircleIcon />,
  };

  return iconMap[status] ?? null;
};

const getStatusLabel = (status: DRStatus, t: TFunction): string =>
  status === DRStatus.WaitForUser ? t('Action needed') : status;

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
      <Content component="p" className="pf-v6-u-mt-md pf-v6-u-font-weight-bold">
        {t('Last synced on')}
      </Content>
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
    <Content
      component="p"
      className="pf-v6-u-mt-md"
      data-test-id="dr-policy-details"
    >
      <strong>{t('DR Policy:')}</strong>
      <br />
      {t('{{policyName}}, sync every {{schedulingInterval}}', {
        policyName,
        schedulingInterval: schedulingInterval || t('Unknown'),
      })}
    </Content>
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
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
}): StatusContent | null => {
  if (
    volumeReplicationHealth === status &&
    kubeObjectReplicationHealth === status
  ) {
    return {
      icon: getStatusIcon(status),
      title: bothTitle,
      message: bothMsg,
      className: `dr-status-${status.toLowerCase()}`,
      status,
    };
  }

  if (volumeReplicationHealth === status) {
    return {
      icon: getStatusIcon(status),
      title: volumeTitle,
      message: volumeMsg,
      className: `dr-status-${status.toLowerCase()}`,
      status,
    };
  }

  if (kubeObjectReplicationHealth === status) {
    return {
      icon: getStatusIcon(status),
      title: kubeTitle,
      message: kubeMsg,
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

const createCompletionStatus = (
  status: DRStatus,
  title: string,
  completionMessage: string,
  healthStatusMessage: string | null,
  className: string
): StatusContent => {
  const message = healthStatusMessage ? (
    <>
      <Content component="p">{completionMessage}</Content>
      <Content component="p" className="pf-v6-u-mt-sm">
        {healthStatusMessage}
      </Content>
    </>
  ) : (
    completionMessage
  );

  return createStatus(status, title, message, className);
};

/**
 * Determines whether to show the progression train view based on DR status and progression data.
 * @param status - Current DR status
 * @param progression - Progression string from DRPC status
 * @param action - DR action type (failover or relocate)
 * @returns true if train view should be displayed
 */
const shouldShowProgressionTrainView = (
  status: DRStatus,
  progression?: string,
  action?: DRActionType
): boolean => {
  // Show train view during active operations (FailingOver/Relocating)
  // OR when waiting for cleanup (WaitOnUserToCleanUp) - so user can see train is stuck at cleanup step
  // OR when phase is FailedOver/Relocated but progression is still active (cleanup steps ongoing)
  return (
    [
      DRStatus.FailingOver,
      DRStatus.Relocating,
      DRStatus.WaitOnUserToCleanUp,
      DRStatus.FailedOver,
      DRStatus.Relocated,
    ].includes(status) &&
    isProgressionActive(progression) &&
    !!action
  );
};

const getCleanupMessage = (phase: Phase, cluster: string, t: TFunction) => {
  return phase === Phase.FailedOver
    ? t('Clean up application resources on failed cluster {{cluster}}.', {
        cluster,
      })
    : t(
        'Clean up application resources on the primary cluster {{cluster}} to start relocating.',
        { cluster }
      );
};

type GetDRStatusDetailsParams = {
  isCleanupRequired: boolean;
  phase: Phase;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth?: VolumeReplicationHealth;
  progression?: string;
  volumeLastGroupSyncTime?: string;
  t: TFunction;
  primaryCluster: string;
  targetCluster: string;
  protectedCondition?: K8sResourceCondition;
  availableCondition?: K8sResourceCondition;
  schedulingInterval?: string;
  actionStartTime?: string;
};

const getDRStatusDetails = ({
  isCleanupRequired,
  phase,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
  progression,
  volumeLastGroupSyncTime,
  t,
  primaryCluster,
  targetCluster,
  protectedCondition,
  availableCondition,
  schedulingInterval,
  actionStartTime,
}: GetDRStatusDetailsParams): StatusContent => {
  const drStatus = getDRStatus({
    isCleanupRequired,
    phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
    progression,
    volumeLastGroupSyncTime,
    protectedCondition,
    schedulingInterval,
    actionStartTime,
  });

  switch (drStatus) {
    case DRStatus.Protecting:
      return createStatus(
        DRStatus.Protecting,
        t('Protecting'),
        protectedCondition?.message ||
          t('Validating application protection. This may take a few minutes.'),
        DR_STATUS_CLASS_NAMES.PROTECTING
      );

    case DRStatus.ProtectionError:
      return createStatus(
        DRStatus.ProtectionError,
        t('Protection Error'),
        protectedCondition?.message ||
          t('An error occurred during application protection.'),
        DR_STATUS_CLASS_NAMES.PROTECTION_ERROR
      );

    case DRStatus.Deleting:
      return createStatus(
        DRStatus.Deleting,
        t('Deleting'),
        availableCondition?.message ||
          t('Removing disaster recovery protection.'),
        DR_STATUS_CLASS_NAMES.PROTECTING
      );

    case DRStatus.Healthy: {
      const title = kubeObjectReplicationHealth
        ? t('All volumes & Kubernetes resources are synced')
        : t('All volumes are synced');
      return createStatus(
        DRStatus.Healthy,
        title,
        null,
        DR_STATUS_CLASS_NAMES.HEALTHY
      );
    }

    case DRStatus.Warning:
      return (
        handleHealthStatus({
          status: DRStatus.Warning,
          volumeTitle: t('Volumes are syncing slower than usual'),
          volumeMsg: t(
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          kubeTitle: t('Kubernetes resources are syncing slower than usual'),
          kubeMsg: t(
            '1 or more Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          bothTitle: t(
            'Volumes & Kubernetes resources are syncing slower than usual'
          ),
          bothMsg: t(
            '1 or more volumes & Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          volumeReplicationHealth,
          kubeObjectReplicationHealth,
        }) ||
        createStatus(
          DRStatus.Healthy,
          t('Status unknown'),
          t('The current status could not be determined.'),
          DR_STATUS_CLASS_NAMES.UNKNOWN
        )
      );

    case DRStatus.Critical:
      return (
        handleHealthStatus({
          status: DRStatus.Critical,
          volumeTitle: t('Volumes are not syncing'),
          volumeMsg: t(
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          kubeTitle: t('Kubernetes resources are not syncing'),
          kubeMsg: t(
            '1 or more Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          bothTitle: t('Volumes & Kubernetes resources are not syncing'),
          bothMsg: t(
            '1 or more volumes & Kubernetes resources are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          volumeReplicationHealth,
          kubeObjectReplicationHealth,
        }) ||
        createStatus(
          DRStatus.Critical,
          t('Status unknown'),
          t('The current status could not be determined.'),
          DR_STATUS_CLASS_NAMES.UNKNOWN
        )
      );

    case DRStatus.WaitOnUserToCleanUp: {
      // For failover: cleanup is needed on the failed cluster (source before failover)
      //   - After failover, primaryCluster is the NEW cluster (where app moved to, C2)
      //   - targetCluster is the OTHER cluster in DR policy (the failed cluster, C1)
      // For relocate: cleanup is needed on the old primary cluster (source before relocate)
      //   - After relocate, primaryCluster is the NEW cluster (where app moved to)
      //   - targetCluster is the OTHER cluster (the old primary cluster)
      // In both cases, targetCluster is the cluster that needs cleanup
      return createStatus(
        DRStatus.WaitOnUserToCleanUp,
        t('Action needed'),
        getCleanupMessage(phase, targetCluster, t),
        DR_STATUS_CLASS_NAMES.ACTION_NEEDED
      );
    }

    case DRStatus.WaitForUser:
      return createStatus(
        DRStatus.WaitForUser,
        t('Action needed'),
        availableCondition?.message || t('User action is required to proceed.'),
        DR_STATUS_CLASS_NAMES.ACTION_NEEDED
      );

    case DRStatus.FailingOver:
      return createStatus(
        DRStatus.FailingOver,
        t('Failing over application to {{targetCluster}}', { targetCluster }),
        t('Deploying the application on the target cluster.'),
        DR_STATUS_CLASS_NAMES.FAILOVER
      );

    case DRStatus.Relocating:
      return createStatus(
        DRStatus.Relocating,
        t('Relocating application to {{targetCluster}}', { targetCluster }),
        t('Deploying the application on the target cluster.'),
        DR_STATUS_CLASS_NAMES.RELOCATING
      );

    case DRStatus.FailedOver: {
      const isHealthy = isReplicationHealthy(
        volumeReplicationHealth,
        kubeObjectReplicationHealth
      );

      const healthStatusMessage = !isHealthy
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

      const completionTitle = t('Failover complete');
      // After failover, primaryCluster is where the app is now running (the failover cluster)
      const completionMessage = t(
        'Application is now running on {{primaryCluster}}.',
        {
          primaryCluster,
        }
      );

      return createCompletionStatus(
        drStatus,
        completionTitle,
        completionMessage,
        healthStatusMessage,
        isHealthy
          ? DR_STATUS_CLASS_NAMES.HEALTHY
          : DR_STATUS_CLASS_NAMES.WARNING
      );
    }

    case DRStatus.Relocated: {
      const isHealthy = isReplicationHealthy(
        volumeReplicationHealth,
        kubeObjectReplicationHealth
      );

      const healthStatusMessage = !isHealthy
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

      const completionTitle = t('Relocation complete');
      // After relocate, primaryCluster is where the app is now running (the preferred cluster)
      const completionMessage = t(
        'Application successfully relocated to {{primaryCluster}}.',
        {
          primaryCluster,
        }
      );

      return createCompletionStatus(
        drStatus,
        completionTitle,
        completionMessage,
        healthStatusMessage,
        isHealthy
          ? DR_STATUS_CLASS_NAMES.HEALTHY
          : DR_STATUS_CLASS_NAMES.WARNING
      );
    }

    default:
      return createStatus(
        DRStatus.Critical,
        t('Status unknown'),
        t('The current status could not be determined.'),
        DR_STATUS_CLASS_NAMES.UNKNOWN
      );
  }
};

const DRStatusPopoverBody: React.FC<{
  status: DRStatus;
  message?: string | React.ReactNode;
  disasterRecoveryStatus: DRStatusProps;
  cleanupDocHref?: string;
}> = ({ status, message, disasterRecoveryStatus, cleanupDocHref }) => {
  // Determine which cluster the user should clean up, based on action and phase.
  // - Failover: always clean up the failed/source cluster (the non-primary cluster).
  // - Relocate (discovered apps): cleanup happens first, before migration, on the current primary.
  // - Relocate (managed or post-migration): cleanup happens on the old primary, which is the non-primary cluster.
  const cleanupCluster =
    disasterRecoveryStatus.action === DRActionType.FAILOVER
      ? disasterRecoveryStatus.targetCluster
      : disasterRecoveryStatus.phase === Phase.Relocating &&
          disasterRecoveryStatus.isDiscoveredApp
        ? disasterRecoveryStatus.primaryCluster
        : disasterRecoveryStatus.targetCluster;

  if (
    shouldShowProgressionTrainView(
      status,
      disasterRecoveryStatus.progression,
      disasterRecoveryStatus.action
    )
  ) {
    return (
      <ProgressionTrainView
        action={disasterRecoveryStatus.action}
        currentProgression={disasterRecoveryStatus.progression}
        applicationName={
          disasterRecoveryStatus.applicationName || 'Application'
        }
        actionStartTime={disasterRecoveryStatus.actionStartTime}
        progressionDetails={disasterRecoveryStatus.progressionDetails}
        isCleanupRequired={disasterRecoveryStatus.isCleanupRequired}
        cleanupCluster={cleanupCluster}
        isDiscoveredApp={disasterRecoveryStatus.isDiscoveredApp}
        learnMoreHref={cleanupDocHref}
      />
    );
  }

  return (
    <>
      {message && (
        <Content
          component="p"
          className="dr-status-popover__description"
          data-test-id="popover-description"
        >
          {message}
        </Content>
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
  );
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
        volumeLastGroupSyncTime: disasterRecoveryStatus.volumeLastGroupSyncTime,
        t,
        primaryCluster: disasterRecoveryStatus.primaryCluster,
        targetCluster: disasterRecoveryStatus.targetCluster,
        protectedCondition: disasterRecoveryStatus.protectedCondition,
        availableCondition: disasterRecoveryStatus.availableCondition,
        schedulingInterval: disasterRecoveryStatus.schedulingInterval,
        actionStartTime: disasterRecoveryStatus.actionStartTime,
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
            <DRStatusPopoverBody
              status={status}
              message={message}
              disasterRecoveryStatus={disasterRecoveryStatus}
              cleanupDocHref={cleanupDocHref}
            />

            {shouldShowSyncDetails({
              status,
              volumeHealth: disasterRecoveryStatus.volumeReplicationHealth,
              kubeHealth: disasterRecoveryStatus.kubeObjectReplicationHealth,
              schedulingInterval: disasterRecoveryStatus.schedulingInterval,
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
          <StatusIconAndText
            title={getStatusLabel(status, t)}
            icon={icon}
          />{' '}
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
