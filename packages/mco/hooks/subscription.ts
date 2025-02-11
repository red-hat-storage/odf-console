import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import {
  WatchK8sResource,
  WatchK8sResultsObject,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
} from '../models';
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
  getApplicationResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  getPlacementRuleResourceObj,
  getSubscriptionResourceObj,
} from './mco-resources';

const getResources = () => ({
  applications: getApplicationResourceObj(),
  placements: getPlacementResourceObj(),
  placementDecisions: getPlacementDecisionsResourceObj(),
  placementRules: getPlacementRuleResourceObj(),
  subscriptions: getSubscriptionResourceObj(),
});

const appFilter = (application: ApplicationKind) =>
  application?.spec?.componentKinds?.some(
    (componentKind) =>
      componentKind.group === ACMSubscriptionModel.apiGroup &&
      componentKind.kind === ACMSubscriptionModel.kind
  );

const getNamespaceWiseApplications = (
  applications: ApplicationKind[]
): NamespaceWiseMapping =>
  applications.reduce(
    (acc, application) =>
      appFilter(application)
        ? {
            ...acc,
            [getNamespace(application)]: [
              ...(acc[getNamespace(application)] || []),
              application,
            ],
          }
        : acc,
    {}
  );

const getNamespaceWiseSubscriptions = (
  subscriptions: ACMSubscriptionKind[]
): NamespaceWiseMapping =>
  subscriptions.reduce(
    (acc, subscription) =>
      isPlacementModel(subscription)
        ? {
            ...acc,
            [getNamespace(subscription)]: [
              ...(acc[getNamespace(subscription)] || []),
              subscription,
            ],
          }
        : acc,
    {}
  );

const getNamespaceWisePlacementDecisions = (
  placementDecisions: ACMPlacementDecisionKind[]
): NamespaceWiseMapping =>
  placementDecisions.reduce(
    (acc, placementDecision) => ({
      ...acc,
      [getNamespace(placementDecision)]: [
        ...(acc[getNamespace(placementDecision)] || []),
        placementDecision,
      ],
    }),
    {} as any
  );

const getNamespaceWisePlacements = (
  placements: ACMPlacementType[]
): NamespaceToNameMapping =>
  placements?.reduce(
    (acc, placement) => ({
      ...acc,
      [getNamespace(placement)]: {
        ...(acc[getNamespace(placement)] || []),
        [getName(placement)]: placement,
      },
    }),
    {}
  );

const generateSubscriptionGroupInfo = (
  application: ApplicationKind,
  subscriptions: ACMSubscriptionKind[],
  placementMap: ACMPlacementMap,
  placementRuleMap: ACMPlacementMap,
  placementDecisions: ACMPlacementDecisionKind[],
  drResources: DisasterRecoveryFormatted[]
): SubscriptionGroupType[] => {
  const placementToAppDeploymentMap: PlacementToAppDeploymentMap = {};
  subscriptions?.forEach((subscription) => {
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
        const placementDecision = findPlacementDecisionUsingPlacement(
          placement as ACMPlacementKind,
          placementDecisions
        );
        placementToAppDeploymentMap[placementUniqueId] = {
          subscriptions: [subscription],
          placement,
          placementDecision,
          ...(!_.isEmpty(drResource)
            ? {
                drInfo: {
                  drClusters: drResource.drClusters,
                  drPolicy: drResource.drPolicy,
                  drPlacementControl: drResource.drPlacementControls?.[0],
                },
              }
            : {}),
        };
      } else {
        placementToAppDeploymentMap[placementUniqueId].subscriptions.push(
          subscription
        );
      }
    }
  });

  return Object.values(placementToAppDeploymentMap) || [];
};

export const useSubscriptionResourceWatch: UseSubscriptionResourceWatch = (
  resource
) => {
  const response = useK8sWatchResources<WatchResourceType>(
    resource?.resources || getResources()
  );

  const {
    data: applications,
    loaded: applicationsLoaded,
    loadError: applicationsLoadError,
  } = response?.applications || resource?.overrides?.applications || {};

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
  } = resource?.drResources || {};

  const loaded =
    applicationsLoaded &&
    placementsLoaded &&
    placementDecisionsLoaded &&
    placementRulesLoaded &&
    subscriptionsLoaded &&
    drLoaded;

  const loadError =
    applicationsLoadError ||
    placementsLoadError ||
    placementDecisionsLoadError ||
    placementRulesLoadError ||
    subscriptionsLoadedError ||
    drLoadError;

  return React.useMemo(() => {
    const applicationDeploymentInfo: ApplicationDeploymentInfo[] = [];
    if (loaded && !loadError) {
      const applicationList = Array.isArray(applications)
        ? applications
        : [applications];
      const subscriptionsList = Array.isArray(subscriptions)
        ? subscriptions
        : [subscriptions];
      const namespaceToApplicationMap =
        getNamespaceWiseApplications(applicationList);
      const namespaceToSubscriptionMap =
        getNamespaceWiseSubscriptions(subscriptionsList);
      const namespaceToPlacementRuleMap =
        getNamespaceWisePlacements(placementRules);
      const namespaceToPlacementMap = getNamespaceWisePlacements(placements);
      const namespaceToPlacementDecisionMap =
        getNamespaceWisePlacementDecisions(placementDecisions);
      Object.keys(namespaceToApplicationMap).forEach((namespace) => {
        namespaceToApplicationMap[namespace].forEach((application) => {
          const subscriptionGroupInfo = generateSubscriptionGroupInfo(
            application,
            namespaceToSubscriptionMap?.[namespace] as ACMSubscriptionKind[],
            namespaceToPlacementMap?.[namespace] || {},
            namespaceToPlacementRuleMap?.[namespace] || {},
            namespaceToPlacementDecisionMap?.[
              namespace
            ] as ACMPlacementDecisionKind[],
            drResourceList?.formattedResources
          );

          applicationDeploymentInfo.push({
            application,
            subscriptionGroupInfo,
          });
        });
      });
    }
    return [applicationDeploymentInfo, loaded, loadError];
  }, [
    applications,
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
  [uniqueName: string]: SubscriptionGroupType;
};

type WatchResourceType = {
  applications?: ApplicationKind | ApplicationKind[];
  placements: ACMPlacementKind[];
  placementDecisions: ACMPlacementDecisionKind[];
  placementRules: ACMPlacementRuleKind[];
  subscriptions: ACMSubscriptionKind[];
};

type WatchResources = {
  resources?: {
    applications?: WatchK8sResource;
    placements: WatchK8sResource;
    placementDecisions: WatchK8sResource;
    placementRules: WatchK8sResource;
    subscriptions: WatchK8sResource;
  };
  drResources?: {
    data: DisasterRecoveryResourceKind;
    loaded: boolean;
    loadError: any;
  };
  overrides?: {
    applications?: WatchK8sResultsObject<ApplicationKind>;
  };
};

type DRInfoType = {
  drPlacementControl?: DRPlacementControlKind;
  drPolicy?: DRPolicyKind;
  drClusters?: DRClusterKind[];
};

type ApplicationDeploymentInfo = {
  application: ApplicationKind;
  subscriptionGroupInfo: SubscriptionGroupType[];
};

type SubscriptionResourceKind = ApplicationDeploymentInfo[];

type UseSubscriptionResourceWatch = (
  resource?: WatchResources
) => [SubscriptionResourceKind, boolean, any];

type NamespaceWiseMapping = {
  [namespace in string]:
    | ApplicationKind[]
    | ACMSubscriptionKind[]
    | ACMPlacementDecisionKind[];
};

type ACMPlacementMap = {
  [name in string]: ACMPlacementRuleKind | ACMPlacementKind;
};

type NamespaceToNameMapping = {
  [namespace in string]: ACMPlacementMap;
};

export type SubscriptionGroupType = {
  subscriptions: ACMSubscriptionKind[];
  placement?: ACMPlacementType;
  placementDecision?: ACMPlacementDecisionKind;
  drInfo?: DRInfoType;
};
