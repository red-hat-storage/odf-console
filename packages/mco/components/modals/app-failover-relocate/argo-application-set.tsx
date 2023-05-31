import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  useK8sWatchResources,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { DRActionType } from '../../../constants';
import {
  getManagedClusterResourceObj,
  useArgoAppSetResourceParser,
  useDRResourceParser,
  getDRResources,
  getArgoAppSetResources,
} from '../../../hooks';
import {
  ACMManagedClusterKind,
  ArgoApplicationSetKind,
  WatchArgoAppSetResourceType,
  WatchDRResourceType,
} from '../../../types';
import {
  findCluster,
  findDeploymentClusterName,
  checkDRActionReadiness,
  getManagedClusterAvailableCondition,
  findDRType,
  isDRClusterFenced,
  findPlacementNameFromAppSet,
} from '../../../utils';
import { FailoverRelocateModal } from './failover-relocate-modal';
import { PlacementProps } from './failover-relocate-modal-body';

export const ArogoApplicationSetModal = (
  props: ArogoApplicationSetModalProps
) => {
  const { application, action, isOpen, close } = props;
  const appNamespace = getNamespace(application);
  const drResources = useK8sWatchResources<WatchDRResourceType>(
    getDRResources(appNamespace)
  );
  const appResources = useK8sWatchResources<WatchArgoAppSetResourceType>(
    getArgoAppSetResources(
      appNamespace,
      findPlacementNameFromAppSet(application)
    )
  );
  const [managedClusters, managedClusterLoaded, ManagedClusterLoadError] =
    useK8sWatchResource<ACMManagedClusterKind[]>(
      getManagedClusterResourceObj()
    );
  const drParserResult = useDRResourceParser({ resources: drResources });
  const appParserResult = useArgoAppSetResourceParser({
    resources: { ...appResources, drResources: drParserResult },
    conditions: { filterByAppName: getName(application) },
  });
  const {
    data: aroAppSetResources,
    loaded: resourceLoaded,
    loadError: resourceLoadedError,
  } = appParserResult;
  const loaded = resourceLoaded && managedClusterLoaded;
  const loadError = resourceLoadedError || ManagedClusterLoadError;
  const aroAppSetResource = aroAppSetResources?.[0];
  const placements: PlacementProps[] = React.useMemo(() => {
    const { siblingApplications, applicationInfo } = aroAppSetResource || {};
    const { drInfo, placementInfo } =
      applicationInfo?.deploymentInfo?.[0] || {};
    const { drClusters, drPlacementControl, drPolicy } = drInfo || {};
    const { placement, placementDecision } = placementInfo || {};
    let deploymentClusterName = findDeploymentClusterName(
      placementDecision,
      drPlacementControl,
      drClusters
    );
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
            isDRActionReady: checkDRActionReadiness(drPlacementControl, action),
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
  }, [aroAppSetResource, managedClusters, loaded, loadError, action]);

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
