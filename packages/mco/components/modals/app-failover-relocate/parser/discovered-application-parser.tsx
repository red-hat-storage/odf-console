import * as React from 'react';
import {
  DRActionType,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
} from '@odf/mco/constants';
import {
  getDRClusterResourceObj,
  getDRPolicyResourceObj,
  getManagedClusterResourceObj,
  useDisasterRecoveryResourceWatch,
} from '@odf/mco/hooks';
import { DRPlacementControlModel } from '@odf/mco/models';
import { ACMManagedClusterKind, DRPlacementControlKind } from '@odf/mco/types';
import {
  checkDRActionReadiness,
  filterManagedClusterUsingDRClusters,
  findCluster,
  findDRType,
  getLastAppDeploymentClusterName,
  isDRClusterFenced,
} from '@odf/mco/utils';
import { CommonModalProps } from '@odf/shared/modals';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { AlertProps, AlertVariant } from '@patternfly/react-core';
import { FailoverRelocateModal } from '../failover-relocate-modal';
import { PlacementControlProps } from '../failover-relocate-modal-body';
import { ValidateManagedClusterCondition } from './argo-application-set-parser';

const getDRResources = (drPlacementControl: DRPlacementControlKind) => ({
  resources: {
    drClusters: getDRClusterResourceObj(),
    drPolicies: getDRPolicyResourceObj({
      name: drPlacementControl.spec?.drPolicyRef?.name,
    }),
  },
  overrides: {
    drPlacementControls: {
      data: drPlacementControl,
      loaded: true,
      loadError: '',
    },
  },
});

const getAlertMessage = (action: DRActionType, t: TFunction): AlertProps =>
  action === DRActionType.FAILOVER
    ? {
        title: t('Attention'),
        variant: AlertVariant.info,
        isInline: true,
        children: (
          <>
            <li>
              {t(
                'A failover will occur for all namespaces currently under this DRPC.'
              )}
            </li>
            <li>
              {t(
                'You need to clean up manually to begin replication after a successful failover.'
              )}
            </li>
          </>
        ),
      }
    : {
        title: t('Attention'),
        variant: AlertVariant.info,
        isInline: true,
        children: (
          <li>
            {t(
              'A relocation will occur for all namespaces currently under this DRPC.'
            )}
          </li>
        ),
      };

export const DiscoveredApplicationParser: React.FC<
  CommonModalProps<DiscoveredApplicationParserProps>
> = ({ isOpen, closeModal, extraProps: { application, action } }) => {
  const { t } = useCustomTranslation();

  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(application)
  );

  const [managedClusters, managedClusterLoaded, managedClusterLoadError] =
    useK8sWatchResource<ACMManagedClusterKind[]>(
      getManagedClusterResourceObj()
    );

  const drResource = drResources?.formattedResources?.[0];

  const loaded = drLoaded && managedClusterLoaded;
  const loadError = drLoadError || managedClusterLoadError;

  const placementControls: PlacementControlProps[] = React.useMemo(() => {
    if (loaded && !loadError) {
      const { drClusters, drPlacementControls } = drResource || {};
      const drPlacementControl = drPlacementControls?.[0];

      // use "drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster" annotation
      // To find current app the deployment cluster
      const deploymentClusterName =
        getLastAppDeploymentClusterName(drPlacementControl);

      const filteredManagedClusters = filterManagedClusterUsingDRClusters(
        drClusters,
        managedClusters
      );

      // Failover/Relocate cluster info
      const targetManagedCluster = findCluster(
        filteredManagedClusters,
        deploymentClusterName
      );
      const targetDRCluster = findCluster(drClusters, deploymentClusterName);
      const targetClusterCondition = ValidateManagedClusterCondition(
        targetManagedCluster,
        MANAGED_CLUSTER_CONDITION_AVAILABLE
      );

      // Surviving cluster info
      const primaryManagedCluster = findCluster(
        filteredManagedClusters,
        deploymentClusterName,
        true
      );
      const primaryDRCluster = findCluster(
        drClusters,
        deploymentClusterName,
        true
      );
      const primaryClusterCondition = ValidateManagedClusterCondition(
        primaryManagedCluster,
        MANAGED_CLUSTER_CONDITION_AVAILABLE
      );

      return [
        {
          // Target
          targetClusterName: getName(targetDRCluster),
          isTargetClusterAvailable: !!targetClusterCondition,
          targetClusterAvailableTime:
            targetClusterCondition?.lastTransitionTime,
          isTargetClusterFenced: isDRClusterFenced(targetDRCluster),

          // Primary
          primaryClusterName: getName(primaryManagedCluster),
          isPrimaryClusterAvailable: !!primaryClusterCondition,
          isPrimaryClusterFenced: isDRClusterFenced(primaryDRCluster),

          // DR info
          drPlacementControlName: getName(drPlacementControl),
          isDRActionReady: checkDRActionReadiness(drPlacementControl, action),
          snapshotTakenTime: drPlacementControl?.status?.lastGroupSyncTime,
          replicationType: findDRType(drClusters),
        },
      ];
    }

    return [];
  }, [drResource, managedClusters, action, loaded, loadError]);

  return (
    <FailoverRelocateModal
      action={action}
      applicationName={getName(application)}
      applicationNamespace={getNamespace(application)}
      applicationModel={DRPlacementControlModel}
      placementControls={placementControls}
      isOpen={isOpen}
      loadError={loadError}
      loaded={loaded}
      close={closeModal}
      message={getAlertMessage(action, t)}
    />
  );
};

type DiscoveredApplicationParserProps = {
  // Discovered application
  application: DRPlacementControlKind;
  // Failover/Relocate
  action: DRActionType;
};
