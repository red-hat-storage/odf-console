import * as React from 'react';
import { VolumeReplicationHealth } from '@odf/mco/constants';
import { Progression } from '@odf/mco/types';
import { DRPlacementControlKind } from '@odf/mco/types';
import { formatTime } from '@odf/shared/details-page/datetime';
import { getNamespace } from '@odf/shared/selectors';
import {
  GreenCheckCircleIcon,
  RedExclamationCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared/status/icons';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button } from '@patternfly/react-core';
import { InProgressIcon } from '@patternfly/react-icons';
import { getReplicationHealth, getReplicationType } from '../../../utils';
import {
  useDRResources,
  getClusterDetails,
  getStartedOnTime,
  getDRPolicyAndInterval,
} from '../../dr-status-popover/parsers/dr-parser-utils';
import {
  getAppWorstSyncStatus,
  isCleanupPending,
  isFailingOrRelocating,
} from '../../protected-applications/utils';
import DRStatusPopup from '../dr-status-popover';

export const DRStatusPopover: React.FC<DRStatusPopoverProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();
  const [isVisible, setIsVisible] = React.useState(false);

  const [drResources] = useDRResources(getNamespace(application));

  const { drPolicyName, schedulingInterval } = getDRPolicyAndInterval(
    drResources,
    application
  );
  const replicationType = getReplicationType(schedulingInterval);

  const computedValues = React.useMemo(() => {
    const volumeLastSyncTime = application?.status?.lastGroupSyncTime;
    const kubeObjectsSchedulingInterval =
      application?.spec?.kubeObjectProtection?.captureInterval;
    const kubeObjectLastProtectionTime =
      application?.status?.lastKubeObjectProtectionTime;

    return {
      syncStatus: {
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
      },
      clusterDetails: getClusterDetails(application, t),
      startedOn: getStartedOnTime(application, t),
    };
  }, [application, replicationType, schedulingInterval, t]);

  const { primaryCluster, targetCluster } = computedValues.clusterDetails;

  const details = React.useMemo(
    () => ({
      primaryCluster,
      targetCluster,
      startedOn: computedValues.startedOn,
      lastSynced: {
        pvc: computedValues.syncStatus.volumeLastGroupSyncTime,
        pvcStatus: computedValues.syncStatus.volumeReplicationStatus,
        kubeObjects: computedValues.syncStatus.kubeObjectLastProtectionTime,
        kubeObjectStatus: computedValues.syncStatus.kubeObjectReplicationStatus,
      },
      drPolicy: drPolicyName || t('Unknown'),
      schedulingInterval: computedValues.syncStatus.schedulingInterval,
    }),
    [primaryCluster, targetCluster, computedValues, drPolicyName, t]
  );

  const worstStatus = getAppWorstSyncStatus(computedValues.syncStatus, t);

  const statusData = React.useMemo(() => {
    if (isCleanupPending(application)) {
      return { icon: <RedExclamationCircleIcon />, title: t('Action Needed') };
    }
    if (isFailingOrRelocating(application)) {
      return {
        icon: <InProgressIcon />,
        title: application.status?.phase || t(Progression.FailingOver),
      };
    }
    if (worstStatus?.title.toLowerCase() === VolumeReplicationHealth.CRITICAL) {
      return { icon: <RedExclamationCircleIcon />, title: worstStatus?.title };
    }
    if (worstStatus?.title.toLowerCase() === VolumeReplicationHealth.WARNING) {
      return {
        icon: <YellowExclamationTriangleIcon />,
        title: worstStatus?.title,
      };
    }
    return { icon: <GreenCheckCircleIcon />, title: t('Healthy') };
  }, [application, worstStatus, t]);

  return (
    <>
      <Button variant="link" isInline onClick={() => setIsVisible(true)}>
        {statusData.icon}
        <span className="pf-v5-u-pl-sm">{statusData.title}</span>
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
