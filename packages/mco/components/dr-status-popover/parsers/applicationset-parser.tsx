import * as React from 'react';
import { DRPCStatus } from '@odf/mco/constants';
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
  getLastAppDeploymentClusterName,
  findCluster,
  getReplicationHealth,
  getReplicationType,
} from '@odf/mco/utils';
import { getNamespace, getName } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import DRStatusPopover, { DRStatusProps } from '../dr-status-popover';

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
      const healthStatus = getReplicationHealth(
        dataLastSyncedOn || '',
        schedulingInterval,
        getReplicationType(schedulingInterval)
      );

      return {
        policyName: getName(drPolicy),
        schedulingInterval: schedulingInterval,
        targetCluster: getName(targetCluster),
        primaryCluster: primaryClusterName,
        volumeLastGroupSyncTime: dataLastSyncedOn,
        volumeReplicationHealth: healthStatus,
        phase: status,
        isLoadedWOError: drLoaded && !drLoadError,
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
