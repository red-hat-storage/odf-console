import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { DRActionType } from '../../../constants';
import { useArgoApplicationSetResourceWatch } from '../../../hooks';
import { ArgoApplicationSetKind } from '../../../types';
import {
  findCluster,
  findDeploymentClusterName,
  isPeerReadyAndAvailable,
  getManagedClusterAvailableCondition,
  findDRType,
  isDRClusterFenced,
} from '../../../utils';
import { FailoverRelocateModal } from './failover-relocate-modal';
import { PlacementProps } from './failover-relocate-modal-body';

export const ArogoApplicationSetModal = (
  props: ArogoApplicationSetModalProps
) => {
  const { application, action, isOpen, close } = props;

  const [aroAppSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch({
      name: getName(application),
      namespace: getNamespace(application),
    });
  const aroAppSetResource = aroAppSetResources?.[0];
  const placements: PlacementProps[] = React.useMemo(() => {
    const {
      drClusters,
      drPlacementControl,
      managedClusters,
      drPolicy,
      placement,
      placementDecision,
      siblingApplications,
    } = aroAppSetResource || {};
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
