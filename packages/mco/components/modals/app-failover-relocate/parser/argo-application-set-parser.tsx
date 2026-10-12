import * as React from 'react';
import { K8sResourceCondition, ArgoApplicationSetModel } from '@odf/shared';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
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
  isDRClusterFenced,
  findPlacementNameFromAppSet,
  getReplicationType,
  getInvalidDRPolicyCondition,
} from '../../../../utils';
import { FailoverRelocateModal } from '../failover-relocate-modal';
import { PlacementControlProps } from '../failover-relocate-modal-body';
import {
  getTestFailoverAlertMessage,
  showManualTestCleanup,
} from '../test-failover-alert';

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
  const { application, action, isOpen, close, isTestFailover } = props;
  const { t } = useCustomTranslation();

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
  const drPlacementControl =
    aroAppSetResource?.placements?.[0]?.drPlacementControl;

  const placementControls: PlacementControlProps[] = React.useMemo(() => {
    const {
      managedClusters,
      siblingApplications,
      placements: resourcePlacements,
    } = aroAppSetResource || {};
    const { drClusters, drPolicy, placementDecision, placement } =
      resourcePlacements?.[0] || {};
    const deploymentClusters = findDeploymentClusters(
      placementDecision,
      drPlacementControl
    );
    const deploymentClusterName = deploymentClusters?.[0] || '';
    const clusterName =
      deploymentClusterName || !isTestFailover ? deploymentClusterName : null;
    const targetCluster =
      clusterName === null
        ? undefined
        : findCluster(managedClusters, clusterName);
    const primaryCluster =
      clusterName === null
        ? undefined
        : findCluster(managedClusters, clusterName, true);
    const targetDRCluster =
      clusterName === null ? undefined : findCluster(drClusters, clusterName);
    const primaryDRCluster =
      clusterName === null
        ? undefined
        : findCluster(drClusters, clusterName, true);
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
            replicationType: getReplicationType(drPolicy),
            isTargetClusterFenced: isDRClusterFenced(targetDRCluster),
            isPrimaryClusterFenced: isDRClusterFenced(primaryDRCluster),
            areSiblingApplicationsFound: !!siblingApplications?.length,
            schedulingInterval: drPolicy?.spec?.schedulingInterval,
            invalidDRPolicy: getInvalidDRPolicyCondition(drPolicy),
          },
        ]
      : [];
  }, [
    aroAppSetResource,
    drPlacementControl,
    loaded,
    loadError,
    action,
    isTestFailover,
  ]);

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
      isTestFailover={isTestFailover}
      message={
        isTestFailover
          ? getTestFailoverAlertMessage(
              t,
              showManualTestCleanup(drPlacementControl)
            )
          : undefined
      }
    />
  );
};

type ArogoApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
  isOpen: boolean;
  action: DRActionType;
  close: () => void;
  isTestFailover?: boolean;
};
