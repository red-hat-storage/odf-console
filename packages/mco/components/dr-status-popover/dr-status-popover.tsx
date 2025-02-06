import * as React from 'react';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import { Progression } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
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
import './dr-status-popover.scss';
import { DRStatusProps } from './parsers/dr-parser-utils';

enum DRStatus {
  WaitOnUserToCleanUp = Progression.WaitOnUserToCleanUp,
  FailingOver = DRPCStatus.FailingOver,
  Relocating = DRPCStatus.Relocating,
  Critical = VolumeReplicationHealth.CRITICAL,
  Warning = VolumeReplicationHealth.WARNING,
  Healthy = VolumeReplicationHealth.HEALTHY,
}

const getStatusIcon = (status?: VolumeReplicationHealth | DRStatus) => {
  switch (status) {
    case VolumeReplicationHealth.CRITICAL:
    case DRStatus.Critical:
    case DRStatus.WaitOnUserToCleanUp:
      return <RedExclamationCircleIcon />;
    case VolumeReplicationHealth.WARNING:
    case DRStatus.Warning:
      return <YellowExclamationTriangleIcon />;
    case VolumeReplicationHealth.HEALTHY:
    case DRStatus.Healthy:
      return <GreenCheckCircleIcon />;
    case DRStatus.FailingOver:
    case DRStatus.Relocating:
      return <InProgressIcon />;
    default:
      return null;
  }
};

const renderDescriptionItem = (term: string, description?: string) => (
  <DescriptionListGroup>
    <DescriptionListTerm>{term}</DescriptionListTerm>
    <DescriptionListDescription>{description}</DescriptionListDescription>
  </DescriptionListGroup>
);

const ClusterDetails: React.FC<{
  primaryCluster: string;
  targetCluster: string;
  status: DRStatus;
}> = React.memo(({ primaryCluster, targetCluster, status }) => {
  const { t } = useCustomTranslation();

  return (
    <DescriptionList isCompact data-test-id="cluster-details">
      {renderDescriptionItem(t('Primary cluster'), primaryCluster)}
      {renderDescriptionItem(t('Target cluster'), targetCluster)}
      {renderDescriptionItem(t('Status'), status)}
    </DescriptionList>
  );
});

const SyncDetails: React.FC<{
  disasterRecoveryStatus: DRStatusProps;
}> = React.memo(({ disasterRecoveryStatus }) => {
  const { t } = useCustomTranslation();

  const volumeLastGroupSyncTime =
    disasterRecoveryStatus.volumeLastGroupSyncTime &&
    formatTime(disasterRecoveryStatus.volumeLastGroupSyncTime);
  const lastKubeObjectProtectionTime =
    disasterRecoveryStatus.lastKubeObjectProtectionTime &&
    formatTime(disasterRecoveryStatus.lastKubeObjectProtectionTime);

  return (
    <>
      <Text className="pf-v5-u-mt-md pf-v5-u-font-weight-bold">
        {t('Last synced on')}
      </Text>
      <SyncStatusLine
        label={t('Application volumes (PVCs):')}
        value={volumeLastGroupSyncTime}
        status={disasterRecoveryStatus.volumeReplicationHealth}
      />
      {(disasterRecoveryStatus.lastKubeObjectProtectionTime ||
        disasterRecoveryStatus.kubeObjectReplicationHealth) && (
        <SyncStatusLine
          label={t('Kubernetes objects:')}
          value={lastKubeObjectProtectionTime}
          status={disasterRecoveryStatus.kubeObjectReplicationHealth}
        />
      )}
    </>
  );
});

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

const SyncStatusLine: React.FC<{
  label: string;
  value?: string;
  status?: VolumeReplicationHealth;
  noDataText?: string;
}> = ({ label, value, status, noDataText }) => {
  const { t } = useCustomTranslation();
  return (
    <Text>
      {getStatusIcon(status)} {label}{' '}
      {value || noDataText || t('No data available')}
    </Text>
  );
};

const HelpLink: React.FC<{
  href: string;
  t: TFunction;
  message: string;
}> = React.memo(({ href, t, message }) => {
  return (
    <Button
      className="dr-status-help-link"
      variant={ButtonVariant.link}
      isInline
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('Open documentation')}
    >
      {message}
    </Button>
  );
});

const DRStatusPopover: React.FC<DRStatusPopoverProps> = ({
  disasterRecoveryStatus,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const { t } = useCustomTranslation();

  const { icon, title, message, className, status } = React.useMemo(
    () => getStatusContent(disasterRecoveryStatus, t),
    [disasterRecoveryStatus, t]
  );

  const togglePopover = React.useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  return (
    disasterRecoveryStatus.isLoaded && (
      <Popover
        aria-label={t('DR status popover')}
        position="top"
        isVisible={isVisible}
        shouldClose={() => setIsVisible(false)}
        headerContent={
          <div
            className={`dr-status-popover__title ${className}`}
            data-test-id="popover-header"
          >
            {icon}{' '}
            <span className={`dr-status-popover__title-text ${className}`}>
              {title}
            </span>
          </div>
        }
        bodyContent={
          <Flex
            direction={{ default: 'column' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            className="dr-status-popover__popover-body"
            data-test-id="popover-body"
          >
            {message && (
              <Text
                className="dr-status-popover__description"
                data-test-id="popover-description"
              >
                {message}
              </Text>
            )}
            {(status === DRStatus.FailingOver ||
              status === DRStatus.Relocating) && (
              <div className="dr-status-popover__cluster-details">
                <ClusterDetails
                  primaryCluster={disasterRecoveryStatus.primaryCluster}
                  targetCluster={disasterRecoveryStatus.targetCluster}
                  status={status}
                />
              </div>
            )}

            {(status === DRStatus.Healthy ||
              status === DRStatus.Warning ||
              status === DRStatus.Critical) && (
              <>
                {disasterRecoveryStatus.volumeReplicationHealth && (
                  <div className="dr-status-popover__sync-details">
                    <SyncDetails
                      disasterRecoveryStatus={disasterRecoveryStatus}
                    />
                  </div>
                )}
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

            {(status === DRStatus.Warning || status === DRStatus.Critical) && (
              <HelpLink
                href={''} // TODO: Waiting for the link from doc team
                t={t}
                message={t('Documentation help link')}
              />
            )}

            {status === DRStatus.FailingOver && (
              <HelpLink
                href={''} // TODO: Waiting for the link from doc team
                t={t}
                message={t('Learn about different failover status')}
              />
            )}

            {status === DRStatus.Relocating && (
              <HelpLink
                href={''} //TODO: Waiting for the link from doc team
                t={t}
                message={t('Learn about different relocate status')}
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
          {icon}
          <span className="pf-v5-u-pl-sm">{status}</span>
        </Button>
      </Popover>
    )
  );
};

// Helper to get DR status
const getDRStatus = ({
  isCleanupRequired,
  phase,
  volumeReplicationHealth,
  kubeObjectReplicationHealth,
}: {
  isCleanupRequired: boolean;
  phase: DRPCStatus;
  volumeReplicationHealth: VolumeReplicationHealth;
  kubeObjectReplicationHealth: VolumeReplicationHealth;
}): DRStatus => {
  if (isCleanupRequired) return DRStatus.WaitOnUserToCleanUp;

  if (phase === DRPCStatus.FailingOver) return DRStatus.FailingOver;
  if (phase === DRPCStatus.Relocating) return DRStatus.Relocating;

  if (
    volumeReplicationHealth === VolumeReplicationHealth.CRITICAL ||
    kubeObjectReplicationHealth === VolumeReplicationHealth.CRITICAL
  ) {
    return DRStatus.Critical;
  }

  if (
    volumeReplicationHealth === VolumeReplicationHealth.WARNING ||
    kubeObjectReplicationHealth === VolumeReplicationHealth.WARNING
  ) {
    return DRStatus.Warning;
  }

  if (
    volumeReplicationHealth === VolumeReplicationHealth.HEALTHY ||
    kubeObjectReplicationHealth === VolumeReplicationHealth.HEALTHY
  ) {
    return DRStatus.Healthy;
  }

  return DRStatus.Critical;
};

const getStatusContent = (drStatusProps: DRStatusProps, t: TFunction) => {
  const {
    isCleanupRequired,
    phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
    primaryCluster,
    targetCluster,
  } = drStatusProps;

  const drStatus = getDRStatus({
    isCleanupRequired,
    phase,
    volumeReplicationHealth,
    kubeObjectReplicationHealth,
  });

  switch (drStatus) {
    case DRStatus.Healthy:
      return {
        icon: getStatusIcon(DRStatus.Healthy),
        title: t('All volumes & Kubernetes objects are synced'),
        className: 'dr-status-healthy',
        status: drStatus,
      };

    case DRStatus.Warning:
      if (
        volumeReplicationHealth === VolumeReplicationHealth.WARNING &&
        kubeObjectReplicationHealth === VolumeReplicationHealth.WARNING
      ) {
        return {
          icon: getStatusIcon(DRStatus.Warning),
          title: t(
            'Volumes & Kubernetes objects are syncing slower than usual'
          ),
          message: t(
            '1 or more volumes & Kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-warning',
          status: drStatus,
        };
      } else if (volumeReplicationHealth === VolumeReplicationHealth.WARNING) {
        return {
          icon: getStatusIcon(DRStatus.Warning),
          title: t('Volumes are syncing slower than usual'),
          message: t(
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-warning',
          status: drStatus,
        };
      } else if (
        kubeObjectReplicationHealth === VolumeReplicationHealth.WARNING
      ) {
        return {
          icon: getStatusIcon(DRStatus.Warning),
          title: t('Kubernetes objects are syncing slower than usual'),
          message: t(
            '1 or more Kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-warning',
          status: drStatus,
        };
      }
      break;

    case DRStatus.Critical:
      if (
        volumeReplicationHealth === VolumeReplicationHealth.CRITICAL &&
        kubeObjectReplicationHealth === VolumeReplicationHealth.CRITICAL
      ) {
        return {
          icon: getStatusIcon(DRStatus.Critical),
          title: t('Volumes & Kubernetes objects are not syncing'),
          message: t(
            '1 or more volumes & Kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-critical',
          status: drStatus,
        };
      } else if (volumeReplicationHealth === VolumeReplicationHealth.CRITICAL) {
        return {
          icon: getStatusIcon(DRStatus.Critical),
          title: t('Volumes are not syncing'),
          message: t(
            '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-critical',
          status: drStatus,
        };
      } else if (
        kubeObjectReplicationHealth === VolumeReplicationHealth.CRITICAL
      ) {
        return {
          icon: getStatusIcon(DRStatus.Critical),
          title: t('Kubernetes objects are not syncing'),
          message: t(
            '1 or more Kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
          ),
          className: 'dr-status-critical',
          status: drStatus,
        };
      }
      break;

    case DRStatus.WaitOnUserToCleanUp:
      return {
        icon: getStatusIcon(DRStatus.WaitOnUserToCleanUp),
        title: t('Action needed'),
        message: (
          <>
            {t(
              'Clean up application resources on failed cluster {{cluster}} to start the replication.',
              {
                cluster:
                  phase === DRPCStatus.FailingOver
                    ? targetCluster
                    : primaryCluster,
              }
            )}
            <Button variant={ButtonVariant.link} isInline href="#">
              {t('How to clean up resources?')}
            </Button>
          </>
        ),
        className: 'dr-status-action-needed',
        status: drStatus,
      };

    case DRStatus.FailingOver:
      return {
        icon: getStatusIcon(DRStatus.FailingOver),
        title: t('Failover in progress'),
        message: t('Deploying the application on the target cluster.'),
        className: 'dr-status-failover',
        status: drStatus,
      };

    case DRStatus.Relocating:
      return {
        icon: getStatusIcon(DRStatus.Relocating),
        title: t('Relocate in progress'),
        message: t('Deploying the application on the target cluster.'),
        className: 'dr-status-relocating',
        status: drStatus,
      };

    default:
      return {
        icon: getStatusIcon(DRStatus.Healthy),
        title: t('Status unknown'),
        message: t('The current status could not be determined.'),
        className: 'dr-status-unknown',
        status: drStatus,
      };
  }
};

export default DRStatusPopover;

type DRStatusPopoverProps = {
  disasterRecoveryStatus: DRStatusProps;
};
