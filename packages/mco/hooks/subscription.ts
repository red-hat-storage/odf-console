import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { ACMPlacementModel, ACMPlacementRuleModel } from '../models';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  DRPlacementControlKind,
  DRPolicyKind,
  DRClusterKind,
  ACMPlacementRuleKind,
  ACMSubscriptionKind,
  ACMPlacementType,
} from '../types';
import {
  findDRResourceUsingPlacement,
  findPlacementDecisionUsingPlacement,
  getPlacementUniqueId,
  isPlacementModel,
  matchApplicationToSubscription,
} from '../utils';
import {
  DisasterRecoveryFormatted,
  DisasterRecoveryResourceKind,
} from './disaster-recovery';
import {
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
} from './mco-resources';

const getResources = (namespace: string) => ({
  placements: getPlacementResourceObj({ namespace }),
  placementDecisions: getPlacementDecisionsResourceObj({ namespace }),
  placementRules: getPlacementRuleResourceObj({ namespace }),
  subscriptions: getSubscriptionResourceObj({ namespace }),
});

const getPlacementMap = (placements: ACMPlacementType[]) => {
  return (
    placements.reduce(
      (arr, placement) => ({
        ...arr,
        [getName(placement)]: placement,
      }),
      {}
    ) || {}
  );
};

const getPlacements = (
  application: ApplicationKind,
  subscriptions: ACMSubscriptionKind[],
  placements: ACMPlacementKind[],
  placementRules: ACMPlacementRuleKind[],
  placementDecisions: ACMPlacementDecisionKind[],
  drResources: DisasterRecoveryFormatted[]
): ApplicationDeploymentInfo[] => {
  const placementRuleMap = getPlacementMap(placementRules);
  const placementMap = getPlacementMap(placements);
  const placementToAppDeploymentMap: PlacementToAppDeploymentMap = {};
  subscriptions.forEach((subscription) => {
    // applying subscription filter from application
    if (
      isPlacementModel(subscription) &&
      matchApplicationToSubscription(subscription, application)
    ) {
      const placementRefKind = subscription.spec.placement.placementRef.kind;
      const placementRefName = subscription.spec.placement.placementRef.name;
      let placement: ACMPlacementType = null;
      if (placementRefKind === ACMPlacementRuleModel.kind) {
        placement = placementRuleMap?.[placementRefName];
      } else if (placementRefKind === ACMPlacementModel.kind) {
        placement = placementMap?.[placementRefName];
      }
      const placementUniqueId = getPlacementUniqueId(
        getName(placement),
        getNamespace(placement),
        placement?.kind
      );
      if (!placementToAppDeploymentMap?.[placementUniqueId]) {
        const drResource = findDRResourceUsingPlacement(
          getName(placement),
          getNamespace(placement),
          drResources,
          placement.kind
        );
        const placementDecision =
          placement.kind === ACMPlacementModel.kind
            ? findPlacementDecisionUsingPlacement(
                placement as ACMPlacementKind,
                placementDecisions
              )
            : null;
        placementToAppDeploymentMap[placementUniqueId] = {
          placement,
          placementDecision,
          drClusters: drResource?.drClusters,
          drPolicy: drResource?.drPolicy,
          drPlacementControl: drResource?.drPlacementControls?.[0],
        };
      }
    }
  });

  return Object.values(placementToAppDeploymentMap) || [];
};

export const useSubscriptionResourceWatch: UseSubscriptionResourceWatch = ({
  application,
  drResources,
}) => {
  const response = useK8sWatchResources<WatchResourceType>(
    getResources(getNamespace(application))
  );

  const {
    data: placements,
    loaded: placementsLoaded,
    loadError: placementsLoadError,
  } = response.placements;

  const {
    data: placementDecisions,
    loaded: placementDecisionsLoaded,
    loadError: placementDecisionsLoadError,
  } = response.placementDecisions;

  const {
    data: placementRules,
    loaded: placementRulesLoaded,
    loadError: placementRulesLoadError,
  } = response.placementRules;

  const {
    data: subscriptions,
    loaded: subscriptionsLoaded,
    loadError: subscriptionsLoadedError,
  } = response.subscriptions;

  const {
    data: drResourceList,
    loaded: drLoaded,
    loadError: drLoadError,
  } = drResources || {};

  const loaded =
    placementsLoaded &&
    placementDecisionsLoaded &&
    placementRulesLoaded &&
    subscriptionsLoaded &&
    drLoaded;

  const loadError =
    placementsLoadError ||
    placementDecisionsLoadError ||
    placementRulesLoadError ||
    subscriptionsLoadedError ||
    drLoadError;

  return React.useMemo(() => {
    const subscriptionResources: SubscriptionResourceKind =
      loaded && !loadError
        ? getPlacements(
            application,
            subscriptions,
            placements,
            placementRules,
            placementDecisions,
            drResourceList?.formattedResources
          )
        : [];

    return [subscriptionResources, loaded, loadError];
  }, [
    application,
    placements,
    placementDecisions,
    placementRules,
    subscriptions,
    drResourceList,
    loaded,
    loadError,
  ]);
};

type PlacementToAppDeploymentMap = {
  [uniqueName: string]: ApplicationDeploymentInfo;
};

type WatchResourceType = {
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
};

type WatchResources = {
  drResources?: {
    data: DisasterRecoveryResourceKind;
    loaded: boolean;
    loadError: any;
  };
  application: ApplicationKind;
};

type ApplicationDeploymentInfo = {
  placement: ACMPlacementType;
  placementDecision?: ACMPlacementDecisionKind;
  drPlacementControl?: DRPlacementControlKind;
  drPolicy?: DRPolicyKind;
  drClusters?: DRClusterKind[];
};

type SubscriptionResourceKind = ApplicationDeploymentInfo[];

type UseSubscriptionResourceWatch = (
  resource?: WatchResources
) => [SubscriptionResourceKind, boolean, any];
