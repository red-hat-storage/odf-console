import * as React from 'react';
import { DRPlacementControlKind, ArgoApplicationSetKind } from '@odf/mco/types';
import {
  findPlacementNameFromAppSet,
  getVolumeReplicationHealth,
} from '@odf/mco/utils';
import { formatTime } from '@odf/shared/details-page/datetime';
import { getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { Button } from '@patternfly/react-core';
import {
  useDRResources,
  getDRPolicyAndInterval,
  getClusterDetails,
  getStartedOnTime,
  getDRStatusData,
} from './dr-parser-utils';
import DRStatusPopup from './dr-status-popover';

const findDRPC = (drResources, application: ArgoApplicationSetKind) => {
  const placementName = findPlacementNameFromAppSet(application);
  if (!placementName) return null;
  return drResources?.drPlacementControls?.find(
    (drpc) => drpc?.spec?.placementRef?.name === placementName
  );
};

const ArgoApplicationDRStatusPopover: React.FC<ArgoApplicationDRStatusPopoverProps> =
  ({ application }) => {
    const { t } = useCustomTranslation();
    const [isVisible, setIsVisible] = React.useState(false);

    const [drResources, drLoaded, drLoadError] = useDRResources(
      getNamespace(application)
    );

    if (!drLoaded || drLoadError) return null;

    const drpc = findDRPC(drResources, application as ArgoApplicationSetKind);
    if (!drpc) return null;

    const { drPolicyName, schedulingInterval } = getDRPolicyAndInterval(
      drResources,
      drpc
    );

    const { primaryCluster, targetCluster } = getClusterDetails(drpc, t);
    const startedOn = getStartedOnTime(drpc, t);

    const latestSyncTime = drpc.status?.lastGroupSyncTime;
    const worstSyncStatus = latestSyncTime
      ? getVolumeReplicationHealth(latestSyncTime, schedulingInterval)[0]
      : undefined;

    const statusData = getDRStatusData(t, drpc.status.phase, worstSyncStatus);

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
            status={statusData.status}
            details={{
              primaryCluster,
              targetCluster,
              startedOn,
              drPolicy: drPolicyName,
              schedulingInterval,
              showKubeObjectStatus: false,
              lastSynced: {
                pvc: latestSyncTime ? formatTime(latestSyncTime) : t('Unknown'),
                pvcStatus: worstSyncStatus || 'Unknown',
              },
            }}
          />
        )}
      </>
    );
  };

export default ArgoApplicationDRStatusPopover;

type ArgoApplicationDRStatusPopoverProps = {
  application: ArgoApplicationSetKind | DRPlacementControlKind;
};
