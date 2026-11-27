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
import { ACMManagedClusterKind, DRPlacementControlKind } from '@odf/mco/types';
import {
  checkDRActionReadiness,
  filterManagedClusterUsingDRClusters,
  findCluster,
  getInvalidDRPolicyCondition,
  getPrimaryClusterName,
  getReplicationType,
  isDRClusterFenced,
} from '@odf/mco/utils';
import { DRPlacementControlModel } from '@odf/shared';
import { CommonModalProps } from '@odf/shared/modals';
import { getName, getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';
import { AlertProps, AlertVariant } from '@patternfly/react-core';
import { FailoverRelocateModal } from '../failover-relocate-modal';
import { PlacementControlProps } from '../failover-relocate-modal-body';
import {
  getTestFailoverAlertMessage,
  requiresManualCleanup,
  showManualTestCleanup,
} from '../test-failover-alert';
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

const getAlertMessage = (
  action: DRActionType,
  t: TFunction,
  showManualCleanup: boolean
): AlertProps =>
  action === DRActionType.FAILOVER
    ? {
        title: t('Attention'),
        variant: AlertVariant.info,
        isInline: true,
        children: (
          <ul>
            <li>
              {t(
                'A failover will occur for all namespaces currently under this DRPC.'
              )}
            </li>
            {showManualCleanup && (
              <li>
                {t(
                  'You need to clean up manually to begin replication after a successful failover.'
                )}
              </li>
            )}
          </ul>
        ),
      }
    : {
        title: t('Attention'),
        variant: AlertVariant.info,
        isInline: true,
        children: (
          <ul>
            <li>
              {t(
                'A relocation will occur for all namespaces currently under this DRPC.'
              )}
            </li>
          </ul>
        ),
      };

export const DRPlacementControlParser: React.FC<
  CommonModalProps<DRPlacementControlParserProps>
> = ({
  isOpen,
  closeModal,
  extraProps: { application, action, isTestFailover },
}) => {
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
      const { drClusters, drPlacementControls, drPolicy } = drResource || {};
      const drPlacementControl = drPlacementControls?.[0];

      // use "drplacementcontrol.ramendr.openshift.io/last-app-deployment-cluster" annotation
      // To find current app the deployment cluster
      const deploymentClusterName = getPrimaryClusterName(drPlacementControl);

      const filteredManagedClusters = filterManagedClusterUsingDRClusters(
        drClusters,
        managedClusters
      );

      // Only skip peer lookup for a test with an empty deployment name.
      // Real Failover must still resolve the peer when the name is empty.
      const skipClusterLookup = isTestFailover && !deploymentClusterName;

      const targetManagedCluster = skipClusterLookup
        ? undefined
        : findCluster(filteredManagedClusters, deploymentClusterName);
      const targetDRCluster = skipClusterLookup
        ? undefined
        : findCluster(drClusters, deploymentClusterName);
      const targetClusterCondition = ValidateManagedClusterCondition(
        targetManagedCluster,
        MANAGED_CLUSTER_CONDITION_AVAILABLE
      );

      const primaryManagedCluster = skipClusterLookup
        ? undefined
        : findCluster(filteredManagedClusters, deploymentClusterName, true);
      const primaryDRCluster = skipClusterLookup
        ? undefined
        : findCluster(drClusters, deploymentClusterName, true);
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
          replicationType: getReplicationType(drPolicy),
          schedulingInterval: drPolicy?.spec?.schedulingInterval,
          invalidDRPolicy: getInvalidDRPolicyCondition(drPolicy),
          isDeploymentClusterUnresolved: skipClusterLookup,
        },
      ];
    }

    return [];
  }, [drResource, managedClusters, action, loaded, loadError, isTestFailover]);

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
      isTestFailover={isTestFailover}
      message={
        isTestFailover
          ? getTestFailoverAlertMessage(
              t,
              showManualTestCleanup(application),
              placementControls?.[0]?.schedulingInterval
            )
          : getAlertMessage(action, t, requiresManualCleanup(application))
      }
    />
  );
};

export type DRPlacementControlParserProps = {
  // Discovered application
  application: DRPlacementControlKind;
  // Failover/Relocate
  action: DRActionType;
  // Failover with spec.dryRun (non-disruptive test)
  isTestFailover?: boolean;
};
