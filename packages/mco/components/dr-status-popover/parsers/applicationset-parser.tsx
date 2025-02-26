import * as React from 'react';
import { ArgoApplicationSetKind, Progression } from '@odf/mco/types';
import {
  findPlacementNameFromAppSet,
  findDRResourceUsingPlacement,
  getVolumeReplicationHealth,
} from '@odf/mco/utils';
import {
  formatTime,
  getTimeDifferenceInSeconds,
} from '@odf/shared/details-page/datetime';
import { getNamespace, getName } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { Button } from '@patternfly/react-core';
import DRStatusPopup from '../dr-status-popover';
import {
  useDRResources,
  getClusterDetails,
  getStartedOnTime,
  getDRStatusData,
} from './dr-parser-utils';

export const ApplicationSetParser: React.FC<ApplicationSetParserProps> = ({
  application,
}) => {
  const { t } = useCustomTranslation();
  const [isVisible, setIsVisible] = React.useState(false);

  const [drResources] = useDRResources(getNamespace(application));

  const drResource = React.useMemo(() => {
    const placementName = findPlacementNameFromAppSet(application);
    return findDRResourceUsingPlacement(
      placementName,
      getNamespace(application),
      drResources?.formattedResources
    );
  }, [drResources, application]);

  const drStatusData = React.useMemo(() => {
    if (!_.isEmpty(drResource)) {
      const drpc = drResource?.drPlacementControls?.[0];
      const drPolicy = drResource?.drPolicy;

      const schedulingInterval = drPolicy?.spec?.schedulingInterval;
      const { primaryCluster, targetCluster } = getClusterDetails(drpc, t);
      const startedOn = getStartedOnTime(drpc, t);

      const latestSyncTime = drpc?.status?.lastGroupSyncTime;
      const worstSyncStatus = latestSyncTime
        ? getVolumeReplicationHealth(
            getTimeDifferenceInSeconds(latestSyncTime),
            schedulingInterval
          )[0]
        : undefined;

      const statusData = getDRStatusData(
        t,
        drpc.status?.phase as Progression,
        worstSyncStatus
      );

      return {
        drPolicyName: getName(drPolicy),
        schedulingInterval,
        primaryCluster,
        targetCluster,
        startedOn,
        latestSyncTime,
        worstSyncStatus,
        statusData,
      };
    }
    return null;
  }, [drResource, t]);

  return !drStatusData ? null : (
    <>
      <Button variant="link" isInline onClick={() => setIsVisible(true)}>
        {drStatusData.statusData.icon}
        <span className="pf-v5-u-pl-sm">{drStatusData.statusData.title}</span>
      </Button>

      {isVisible && (
        <DRStatusPopup
          isOpen={isVisible}
          onClose={() => setIsVisible(false)}
          status={drStatusData.statusData.status}
          details={{
            primaryCluster: drStatusData.primaryCluster,
            targetCluster: drStatusData.targetCluster,
            startedOn: drStatusData.startedOn,
            drPolicy: drStatusData.drPolicyName,
            schedulingInterval: drStatusData.schedulingInterval,
            showKubeObjectStatus: false,
            lastSynced: {
              pvc: drStatusData.latestSyncTime
                ? formatTime(drStatusData.latestSyncTime)
                : t('Unknown'),
              pvcStatus: drStatusData.worstSyncStatus || 'Unknown',
            },
          }}
        />
      )}
    </>
  );
};

export default ApplicationSetParser;

type ApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
};
