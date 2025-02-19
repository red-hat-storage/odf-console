import * as React from 'react';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import { Progression } from '@odf/mco/types';
import { DRPlacementControlKind, DRPolicyKind } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
import { getNamespace, getName } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { getReplicationHealth, getReplicationType } from '../../utils';
import {
  useDRResources,
  getClusterDetails,
  getStartedOnTime,
} from '../dr-status-popover/dr-parser-utils';
import {
  getAppWorstSyncStatus,
  isCleanupPending,
  isFailingOrRelocating,
} from '../protected-applications/utils';
import DRStatusPopup from './dr-status-popover';

export const DRStatusPopover: React.FC<DRStatusPopoverProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();
  const [isVisible, setIsVisible] = React.useState(false);

  const [drResources, drLoaded, drLoadError] = useDRResources(
    getNamespace(application)
  );

  if (!drLoaded || drLoadError) {
    return null;
  }

  const drPlacementControl = drResources?.drPlacementControls?.[0];
  const drPolicies = drResources?.drPolicies || [];

  if (!drPlacementControl) {
    return null;
  }

  const drPolicy: DRPolicyKind | undefined = drPolicies.find(
    (policy) => getName(policy) === drPlacementControl?.spec?.drPolicyRef?.name
  );

  const schedulingInterval = drPolicy?.spec?.schedulingInterval;
  const replicationType = getReplicationType(schedulingInterval);
  const volumeLastSyncTime = drPlacementControl?.status?.lastGroupSyncTime;
  const kubeObjectsSchedulingInterval =
    drPlacementControl?.spec?.kubeObjectProtection?.captureInterval;
  const kubeObjectLastProtectionTime =
    drPlacementControl?.status?.lastKubeObjectProtectionTime;

  const syncStatus = {
    volumeReplicationType: replicationType,
    volumeReplicationStatus: getReplicationHealth(
      volumeLastSyncTime,
      schedulingInterval,
      replicationType
    ),
    volumeLastGroupSyncTime: volumeLastSyncTime
      ? formatTime(volumeLastSyncTime)
      : t('Unknown'),
    kubeObjectReplicationStatus: getReplicationHealth(
      kubeObjectLastProtectionTime,
      kubeObjectsSchedulingInterval,
      replicationType
    ),
    kubeObjectLastProtectionTime: kubeObjectLastProtectionTime
      ? formatTime(kubeObjectLastProtectionTime)
      : t('Unknown'),
    replicationType,
    schedulingInterval,
  };

  const { primaryCluster, targetCluster } = getClusterDetails(
    drPlacementControl,
    t
  );

  const startedOn = getStartedOnTime(drPlacementControl, t);

  const details = {
    primaryCluster,
    targetCluster,
    startedOn,
    lastSynced: {
      pvc: syncStatus.volumeLastGroupSyncTime,
      pvcStatus: syncStatus.volumeReplicationStatus,
      kubeObjects: syncStatus.kubeObjectLastProtectionTime,
      kubeObjectStatus: syncStatus.kubeObjectReplicationStatus,
    },
    drPolicy: drPolicy?.metadata?.name || t('Unknown'),
    schedulingInterval: syncStatus.schedulingInterval,
  };

  const worstStatus = getAppWorstSyncStatus(syncStatus, t);

  let statusData = {
    icon: <GreenCheckCircleIcon />,
    title: t('Healthy'),
  };

  if (isCleanupPending(application)) {
    statusData = {
      icon: <RedExclamationCircleIcon />,
      title: t('Action Needed'),
    };
  } else if (isFailingOrRelocating(application)) {
    statusData = {
      icon: <InProgressIcon />,
      title: application.status?.phase || t(Progression.FailingOver),
    };
  } else if (
    worstStatus?.title.toLowerCase() === VolumeReplicationHealth.CRITICAL
  ) {
    statusData = {
      icon: <RedExclamationCircleIcon />,
      title: worstStatus?.title,
    };
  } else if (
    worstStatus?.title.toLowerCase() === VolumeReplicationHealth.WARNING
  ) {
    statusData = {
      icon: <YellowExclamationTriangleIcon />,
      title: worstStatus?.title,
    };
  }

  return (
    <>
      <Button variant="link" isInline onClick={() => setIsVisible(true)}>
        {statusData.icon}
        <span className="pf-v5-u-pl-sm">{worstStatus.title}</span>
      </Button>

      {isVisible && (
        <DRStatusPopup
          isOpen={isVisible}
          onClose={() => setIsVisible(false)}
          status={statusData.title}
          details={details}
        />
      )}
    </>
  );
};

export default DRStatusPopover;

type DRStatusPopoverProps = {
  application: DRPlacementControlKind;
};
