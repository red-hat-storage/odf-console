import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { DRActionType } from '../../../constants';
import {
  DisasterRecoveryResourceKind,
  getApplicationSetResourceObj,
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  getManagedClusterResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  useArgoApplicationSetResourceWatch,
  useDisasterRecoveryResourceWatch,
} from '../../../hooks';
import { ArgoApplicationSetKind } from '../../../types';
import {
  findCluster,
  findDeploymentClusterName,
  isPeerReadyAndAvailable,
  getManagedClusterAvailableCondition,
  findDRType,
  isDRClusterFenced,
  findPlacementNameFromAppSet,
} from '../../../utils';
import { FailoverRelocateModal } from './failover-relocate-modal';
import { PlacementProps } from './failover-relocate-modal-body';

const getDRResources = (namespace: string) => ({
  resources: {
    drClusters: getDRClusterResourceObj(),
    drPolicies: getDRPolicyResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace: namespace,
    }),
  },
});

const getApplicationSetResources = (
  namespace: string,
  appName: string,
  placementName: string,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  resources: {
    managedClusters: getManagedClusterResourceObj(),
    applications: getApplicationSetResourceObj({ namespace: namespace }),
    placements: getPlacementResourceObj({
      name: placementName,
      namespace: namespace,
    }),
    placementDecisions: getPlacementDecisionsResourceObj({
      namespace: namespace,
    }),
  },
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  conditions: {
    filterByAppName: appName,
  },
});

export const ArogoApplicationSetModal = (
  props: ArogoApplicationSetModalProps
) => {
  const { application, action, isOpen, close } = props;
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(getNamespace(application))
  );
  const [aroAppSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(
        getNamespace(application),
        getName(application),
        findPlacementNameFromAppSet(application),
        drResources,
        drLoaded,
        drLoadError
      )
    );
  const aroAppSetResource = aroAppSetResources?.formattedResources?.[0];
  const placements: PlacementProps[] = React.useMemo(() => {
    const { managedClusters, siblingApplications, placements } =
      aroAppSetResource || {};
    const {
      drClusters,
      drPlacementControl,
      drPolicy,
      placementDecision,
      placement,
    } = placements?.[0] || {};
    const deploymentClusterName = findDeploymentClusterName(placementDecision);
    const targetCluster = findCluster(managedClusters, deploymentClusterName);
    const primaryCluster = findCluster(
      managedClusters,
      deploymentClusterName,
      true
    );
    const targetDRCluster = findCluster(drClusters, deploymentClusterName);
    const primaryDRCluster = findCluster(
      drClusters,
      deploymentClusterName,
      true
    );
    const primaryClusterCondition =
      getManagedClusterAvailableCondition(primaryCluster);
    const targetClusterCondition =
      getManagedClusterAvailableCondition(targetCluster);
    return loaded && !loadError
      ? [
          {
            placementName: getName(placement),
            drPolicyName: getName(drPolicy),
            drPlacementControlName: getName(drPlacementControl),
            targetClusterName: getName(targetDRCluster),
            isTargetClusterAvailable: !!targetClusterCondition,
            targetClusterAvailableTime:
              targetClusterCondition?.lastTransitionTime,
            isPrimaryClusterAvailable: !!primaryClusterCondition,
            isPeerReady: isPeerReadyAndAvailable(drPlacementControl),
            snapshotTakenTime: drPlacementControl?.status?.lastGroupSyncTime,
            preferredCluster: drPlacementControl?.spec?.preferredCluster,
            failoverCluster: drPlacementControl?.spec?.failoverCluster,
            replicationType: findDRType(drClusters),
            isTargetClusterFenced: isDRClusterFenced(targetDRCluster),
            isPrimaryClusterFenced: isDRClusterFenced(primaryDRCluster),
            areSiblingApplicationsFound: !!siblingApplications?.length,
          },
        ]
      : [];
  }, [aroAppSetResource, loaded, loadError]);

  return (
    <FailoverRelocateModal
      action={action}
      applicationName={getName(application)}
      applicationNamespace={getNamespace(application)}
      placements={placements}
      isOpen={isOpen}
      loadError={loadError}
      loaded={loaded}
      close={close}
    />
  );
};

type ArogoApplicationSetModalProps = {
  application: ArgoApplicationSetKind;
  isOpen: boolean;
  action: DRActionType;
  close: () => void;
};
