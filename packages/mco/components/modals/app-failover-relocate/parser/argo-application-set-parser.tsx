import * as React from 'react';
import { ArgoApplicationSetModel } from '@odf/mco/models';
import { K8sResourceCondition } from '@odf/shared';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  DRActionType,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
} from '../../../../constants';
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
} from '../../../../hooks';
import {
  ACMManagedClusterKind,
  ArgoApplicationSetKind,
} from '../../../../types';
import {
  findCluster,
  findDeploymentClusters,
  checkDRActionReadiness,
  findDRType,
  isDRClusterFenced,
  findPlacementNameFromAppSet,
} from '../../../../utils';
import { FailoverRelocateModal } from '../failover-relocate-modal';
import { PlacementControlProps } from '../failover-relocate-modal-body';

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

export const ValidateManagedClusterCondition = (
  managedCluster: ACMManagedClusterKind,
  conditionType: string
): K8sResourceCondition =>
  managedCluster?.status?.conditions?.find(
    (condition) =>
      condition?.type === conditionType && condition.status === 'True'
  );

export const ArogoApplicationSetParser = (
  props: ArogoApplicationSetParserProps
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
  const placementControls: PlacementControlProps[] = React.useMemo(() => {
    const {
      managedClusters,
      siblingApplications,
      placements: resourcePlacements,
    } = aroAppSetResource || {};
    const { drClusters, drPlacementControl, placementDecision, placement } =
      resourcePlacements?.[0] || {};
    const deploymentClusters = findDeploymentClusters(
      placementDecision,
      drPlacementControl
    );
    const deploymentClusterName = deploymentClusters?.[0] || '';
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
    const primaryClusterCondition = ValidateManagedClusterCondition(
      primaryCluster,
      MANAGED_CLUSTER_CONDITION_AVAILABLE
    );
    const targetClusterCondition = ValidateManagedClusterCondition(
      targetCluster,
      MANAGED_CLUSTER_CONDITION_AVAILABLE
    );
    return loaded && !loadError
      ? [
          {
            placementName: getName(placement),
            drPlacementControlName: getName(drPlacementControl),
            targetClusterName: getName(targetDRCluster),
            primaryClusterName: getName(primaryCluster),
            isTargetClusterAvailable: !!targetClusterCondition,
            targetClusterAvailableTime:
              targetClusterCondition?.lastTransitionTime,
            isPrimaryClusterAvailable: !!primaryClusterCondition,
            isDRActionReady: checkDRActionReadiness(drPlacementControl, action),
            snapshotTakenTime: drPlacementControl?.status?.lastGroupSyncTime,
            replicationType: findDRType(drClusters),
            isTargetClusterFenced: isDRClusterFenced(targetDRCluster),
            isPrimaryClusterFenced: isDRClusterFenced(primaryDRCluster),
            areSiblingApplicationsFound: !!siblingApplications?.length,
          },
        ]
      : [];
  }, [aroAppSetResource, loaded, loadError, action]);

  return (
    <FailoverRelocateModal
      action={action}
      applicationName={getName(application)}
      applicationNamespace={getNamespace(application)}
      applicationModel={ArgoApplicationSetModel}
      placementControls={placementControls}
      isOpen={isOpen}
      loadError={loadError}
      loaded={loaded}
      close={close}
    />
  );
};

type ArogoApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
  isOpen: boolean;
  action: DRActionType;
  close: () => void;
};
