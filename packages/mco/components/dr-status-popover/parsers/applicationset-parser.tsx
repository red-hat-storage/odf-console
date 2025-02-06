import * as React from 'react';
import { DRPCStatus, VolumeReplicationHealth } from '@odf/mco/constants';
import {
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  useDisasterRecoveryResourceWatch,
} from '@odf/mco/hooks';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import {
  findPlacementNameFromAppSet,
  findDRResourceUsingPlacement,
  getVolumeReplicationHealth,
  getLastAppDeploymentClusterName,
  findCluster,
} from '@odf/mco/utils';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { getNamespace, getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import DRStatusPopover from '../dr-status-popover';
import { DRStatusProps } from './dr-parser-utils';

const getDRResources = (namespace: string) => ({
  resources: {
    drPolicies: getDRPolicyResourceObj(),
    drClusters: getDRClusterResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace: namespace,
    }),
  },
});

const ApplicationSetParser: React.FC<ApplicationSetParserProps> = ({
  application,
}) => {
  const namespace = getNamespace(application);
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(namespace)
  );
  const formattedResources = drResources?.formattedResources;
  const placementName = findPlacementNameFromAppSet(application);

  const drStatus: DRStatusProps = React.useMemo(() => {
    const drResource = findDRResourceUsingPlacement(
      placementName,
      namespace,
      formattedResources
    );

    if (!_.isEmpty(drResource)) {
      const drpc = drResource?.drPlacementControls?.[0];
      const drPolicy = drResource?.drPolicy;
      const status = drpc?.status?.phase as DRPCStatus;
      const primaryClusterName = getLastAppDeploymentClusterName(drpc);
      const targetCluster = findCluster(
        drResource.drClusters,
        primaryClusterName
      );
      const schedulingInterval = drPolicy?.spec?.schedulingInterval;
      const dataLastSyncedOn = drpc?.status?.lastGroupSyncTime;
      const healthStatus = dataLastSyncedOn
        ? getVolumeReplicationHealth(
            getTimeDifferenceInSeconds(dataLastSyncedOn),
            schedulingInterval
          )[0]
        : VolumeReplicationHealth.HEALTHY;

      return {
        policyName: getName(drPolicy),
        schedulingInterval: schedulingInterval,
        targetCluster: targetCluster?.metadata?.name,
        primaryCluster: primaryClusterName,
        volumeLastGroupSyncTime: dataLastSyncedOn,
        volumeReplicationHealth: healthStatus,
        phase: status,
        isLoaded: drLoaded && !drLoadError,
      };
    }
    return null;
  }, [placementName, namespace, formattedResources, drLoaded, drLoadError]);

  return drStatus && <DRStatusPopover disasterRecoveryStatus={drStatus} />;
};

type ApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
};

export default ApplicationSetParser;
