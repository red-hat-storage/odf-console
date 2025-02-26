import * as React from 'react';
import { DRPCStatus } from '@odf/mco/constants';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Modal,
  ModalVariant,
  Text,
} from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import './dr-status.scss';

enum DRStatus {
  ACTION_NEEDED = 'Action Needed',
  FAILING_OVER = DRPCStatus.FailingOver,
  RELOCATING = DRPCStatus.Relocating,
  CRITICAL = 'critical',
  WARNING = 'warning',
  HEALTHY = 'healthy',
}

type DRStatusPopupProps = {
  isOpen: boolean;
  onClose: () => void;
  status: DRStatus | string;
  details: DRStatusDetails;
};

type DRStatusDetails = {
  primaryCluster?: string;
  targetCluster?: string;
  startedOn?: string;
  lastSynced?: LastSyncedDetails;
  drPolicy?: string;
  schedulingInterval?: string;
  helpLink?: string;
  showKubeObjectStatus?: boolean;
};

type LastSyncedDetails = {
  pvc: string;
  pvcStatus?: string;
  kubeObjects?: string;
  kubeObjectStatus?: string;
};

const ClusterDetails: React.FC<{
  details: DRStatusDetails;
  status: DRStatus | string;
}> = ({ details, status }) =>
  [DRStatus.FAILING_OVER, DRStatus.RELOCATING].includes(status as DRStatus) ? (
    <DescriptionList isCompact>
      {renderDescriptionItem('Primary cluster', details.primaryCluster)}
      {renderDescriptionItem('Target cluster', details.targetCluster)}
      {renderDescriptionItem('Started on', details.startedOn)}
      {renderDescriptionItem('Status', status)}
    </DescriptionList>
  ) : null;

const SyncDetails: React.FC<{
  lastSynced?: LastSyncedDetails;
  showKubeObjectStatus?: boolean;
}> = ({ lastSynced, showKubeObjectStatus = true }) => {
  const { t } = useCustomTranslation();

  return (
    <>
      <Text className="pf-v5-u-mt-md pf-v5-u-font-weight-bold">
        {t('Last synced on')}
      </Text>
      {renderSyncStatus(
        t('Application volumes (PVCs):'),
        lastSynced?.pvc,
        lastSynced?.pvcStatus
      )}
      {showKubeObjectStatus &&
        renderSyncStatus(
          t('Kubernetes objects:'),
          lastSynced?.kubeObjects,
          lastSynced?.kubeObjectStatus
        )}
    </>
  );
};

const DRPolicyDetails: React.FC<{
  drPolicy?: string;
  schedulingInterval?: string;
}> = ({ drPolicy, schedulingInterval }) =>
  drPolicy ? (
    <Text className="pf-v5-u-mt-md">
      <strong>DR Policy:</strong>
      <br />
      {`${drPolicy}, sync every ${schedulingInterval || 'Unknown'}`}
    </Text>
  ) : null;

const DRStatusPopup: React.FC<DRStatusPopupProps> = ({
  isOpen,
  onClose,
  status,
  details,
}) => {
  const { t } = useCustomTranslation();
  const { icon, title, message, className } = getStatusContent(
    status,
    details,
    t
  );
  const showInfoContent = ![
    DRStatus.FAILING_OVER,
    DRStatus.RELOCATING,
    DRStatus.ACTION_NEEDED,
  ].includes(status as DRStatus);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={ModalVariant.small}
      title={<ModalTitle icon={icon} title={title} className={className} />}
    >
      {message && <Text className="dr-status-description">{message}</Text>}
      <ClusterDetails details={details} status={status} />
      {showInfoContent && details.lastSynced && (
        <SyncDetails
          lastSynced={details.lastSynced}
          showKubeObjectStatus={details.showKubeObjectStatus}
        />
      )}
      {showInfoContent && (
        <DRPolicyDetails
          drPolicy={details.drPolicy}
          schedulingInterval={details.schedulingInterval}
        />
      )}
      {status.toLowerCase() !== DRStatus.HEALTHY && (
        <HelpLink href={details.helpLink} t={t} status={status} />
      )}
    </Modal>
  );
};

const renderDescriptionItem = (term: string, description?: string) => (
  <DescriptionListGroup>
    <DescriptionListTerm>{term}</DescriptionListTerm>
    <DescriptionListDescription>
      {description || 'Unknown'}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

const renderSyncStatus = (label: string, value?: string, status?: string) => (
  <Text>
    {getStatusIcon(status)} {label} {value || 'No data available'}
  </Text>
);

const getStatusIcon = (status?: string) => {
  switch (status) {
    case DRStatus.CRITICAL:
      return <RedExclamationCircleIcon />;
    case DRStatus.WARNING:
      return <YellowExclamationTriangleIcon />;
    default:
      return null;
  }
};

const ModalTitle: React.FC<{
  icon: React.ReactNode;
  title: string;
  className: string;
}> = ({ icon, title, className }) => (
  <div>
    {icon}
    <span className={`pf-v5-u-pl-sm dr-status-title ${className}`}>
      {title}
    </span>
  </div>
);

const HelpLink: React.FC<{
  href: string;
  t: Function;
  status: DRStatus | string;
}> = ({ href, t, status }) => {
  const isFailoverOrRelocate = [
    DRStatus.FAILING_OVER,
    DRStatus.RELOCATING,
  ].includes(status as DRStatus);
  const linkText = isFailoverOrRelocate
    ? t('Learn about different failover status')
    : t('Documentation help link');

  return (
    <Button
      className="dr-status-help-link"
      variant="link"
      isInline
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {linkText}
    </Button>
  );
};

const getStatusContent = (
  status: DRStatus | string,
  details: DRStatusDetails,
  t: Function
) => {
  const volumeStatus = details.lastSynced?.pvcStatus;
  const kubeObjectStatus = details.lastSynced?.kubeObjectStatus;

  const statusMap = {
    [DRStatus.ACTION_NEEDED]: {
      icon: <RedExclamationCircleIcon />,
      title: t('Action needed'),
      message: (
        <>
          {t(
            `Clean up application resources on failed cluster ${
              details.primaryCluster || 'Unknown'
            } to start the replication. `
          )}
          <Button variant="link" isInline href="#">
            {t('How to clean up resources?')}
          </Button>
        </>
      ),
      className: 'dr-status-action-needed',
    },
    [DRStatus.FAILING_OVER]: {
      icon: <InProgressIcon />,
      title: t('Failover in progress'),
      message: t('Deploying the application on the target cluster.'),
      className: 'dr-status-failover',
    },
    [DRStatus.RELOCATING]: {
      icon: <InProgressIcon />,
      title: t('Relocate in progress'),
      message: t('Deploying the application on the target cluster.'),
      className: 'dr-status-relocating',
    },
    criticalVolumesAndObjects: {
      icon: <RedExclamationCircleIcon />,
      title: t('Volumes & Kubernetes objects are not syncing'),
      message: t(
        '1 or more volumes & kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
      ),
      className: 'dr-status-critical',
      helpLink: 'TEST',
    },
    criticalVolumes: {
      icon: <RedExclamationCircleIcon />,
      title: t('Volumes are not syncing'),
      message: t(
        '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
      ),
      className: 'dr-status-critical',
    },
    criticalObjects: {
      icon: <RedExclamationCircleIcon />,
      title: t('Kubernetes objects are not syncing'),
      message: t(
        '1 or more kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
      ),
      className: 'dr-status-critical',
      helpLink: 'TEST',
    },
    warningVolumesAndObjects: {
      icon: <YellowExclamationTriangleIcon />,
      title: t('Volumes & Kubernetes objects are syncing slower than usual'),
      message: t(
        '1 or more volumes & kubernetes objects are affected. Some step to resolve this issue.'
      ),
      className: 'dr-status-warning',
    },
    warningVolumes: {
      icon: <YellowExclamationTriangleIcon />,
      title: t('Volumes are syncing slower than usual'),
      message: t(
        '1 or more volume groups are affected. Check the network connection, cluster health, or workload status for potential issues.'
      ),
      className: 'dr-status-warning',
    },
    warningObjects: {
      icon: <YellowExclamationTriangleIcon />,
      title: t('Kubernetes objects are syncing slower than usual'),
      message: t(
        '1 or more kubernetes objects are affected. Check the network connection, cluster health, or workload status for potential issues.'
      ),
      className: 'dr-status-warning',
    },
    default: {
      icon: <GreenCheckCircleIcon />,
      title: t('All volumes & Kubernetes objects are synced'),
      className: 'dr-status-healthy',
    },
  };

  if (status === DRStatus.ACTION_NEEDED)
    return statusMap[DRStatus.ACTION_NEEDED];
  if (status === DRStatus.FAILING_OVER) return statusMap[DRStatus.FAILING_OVER];
  if (status === DRStatus.RELOCATING) return statusMap[DRStatus.RELOCATING];

  if (
    volumeStatus === DRStatus.CRITICAL &&
    kubeObjectStatus === DRStatus.CRITICAL
  )
    return statusMap.criticalVolumesAndObjects;
  if (volumeStatus === DRStatus.CRITICAL) return statusMap.criticalVolumes;
  if (kubeObjectStatus === DRStatus.CRITICAL) return statusMap.criticalObjects;
  if (
    volumeStatus === DRStatus.WARNING &&
    kubeObjectStatus === DRStatus.WARNING
  )
    return statusMap.warningVolumesAndObjects;
  if (volumeStatus === DRStatus.WARNING) return statusMap.warningVolumes;
  if (kubeObjectStatus === DRStatus.WARNING) return statusMap.warningObjects;

  if (status === DRStatus.CRITICAL) return statusMap.criticalVolumes;
  if (status === DRStatus.WARNING) return statusMap.warningVolumes;
  return statusMap[status as DRStatus] || statusMap.default;
};

export default DRStatusPopup;
