import * as React from 'react';
import { ACMPlacementModel } from '@odf/shared';
import { getLabel, getNamespace } from '@odf/shared/selectors';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { DISCOVERED_APP_NS } from '../constants';
import {
  ACMSubscriptionKind,
  ArgoApplicationSetKind,
  DRPlacementControlKind,
} from '../types';
import { findPlacementNameFromAppSet, isPlacementModel } from '../utils';
import {
  getApplicationSetResourceObj,
  getSubscriptionResourceObj,
  getDRPlacementControlResourceObj,
} from './mco-resources';

const getPlacementUniqueName = (name, kind, namespace) =>
  `${name}-${kind}-${namespace}`;

const getResources = () => ({
  applicationSets: getApplicationSetResourceObj(),
  subscriptions: getSubscriptionResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj(),
});

// To find a protected placement to DRPlacementControl mapping and DRPolicy to discovered the applications count
const getProtectedPlacementMap = (
  loadedWOError: boolean,
  drpcs: DRPlacementControlKind[]
): [ProtectedPlacementMap, DRPolicyToAppCount] => {
  const protectedPlacementMap: ProtectedPlacementMap = {};
  const drPolicyToDiscoveredAppsCount: DRPolicyToAppCount = {};

  if (loadedWOError) {
    drpcs.forEach((drpc) => {
      const { name, kind } = drpc.spec.placementRef;
      const namespace = getNamespace(drpc);
      const placementUniqueName = getPlacementUniqueName(name, kind, namespace);
      protectedPlacementMap[placementUniqueName] = drpc;

      if (namespace === DISCOVERED_APP_NS) {
        const drPolicyName = drpc.spec.drPolicyRef.name;
        drPolicyToDiscoveredAppsCount[drPolicyName] =
          (drPolicyToDiscoveredAppsCount[drPolicyName] || 0) + 1;
      }
    });
  }

  return [protectedPlacementMap, drPolicyToDiscoveredAppsCount];
};

const countDRPolicyToAppSets = (
  loadedWOError: boolean,
  appSets: ArgoApplicationSetKind[],
  protectedPlacementMap: ProtectedPlacementMap
): DRPolicyToAppCount => {
  const drPolicyToAppsetCount: DRPolicyToAppCount = {};
  if (loadedWOError) {
    appSets?.forEach((appSet) => {
      const placementName = findPlacementNameFromAppSet(appSet);
      const placementUniqueName = getPlacementUniqueName(
        placementName,
        ACMPlacementModel.kind,
        getNamespace(appSet)
      );

      // Check if the placementUniqueName is present in the protectedPlacementMap
      if (protectedPlacementMap.hasOwnProperty(placementUniqueName)) {
        const drpc = protectedPlacementMap[placementUniqueName];
        const drPolicyName = drpc?.spec.drPolicyRef.name;
        drPolicyToAppsetCount[drPolicyName] =
          (drPolicyToAppsetCount[drPolicyName] || 0) + 1;
      }
    });
  }
  return drPolicyToAppsetCount;
};

const mapSubscriptionsToPlacements = (
  loadedWOError: boolean,
  subscriptions: ACMSubscriptionKind[]
): SubscriptionsToPlacementsMap => {
  const subsMap: SubscriptionsToPlacementsMap = {};
  if (loadedWOError) {
    subscriptions?.forEach((subscription) => {
      if (isPlacementModel(subscription)) {
        const subsNamespace = getNamespace(subscription);
        const applicationName = getLabel(subscription, 'app');
        const appUniqueName = `${applicationName}-${subsNamespace}`;
        const { name, kind } = subscription.spec.placement.placementRef;
        const placementUniqueName = getPlacementUniqueName(
          name,
          kind,
          subsNamespace
        );

        // More than one subscription of the same application can refer to the same or different placement/placementRule
        if (!subsMap.hasOwnProperty(appUniqueName)) {
          subsMap[appUniqueName] = new Set<string>();
        }
        subsMap[appUniqueName].add(placementUniqueName);
      }
    });
  }
  return subsMap;
};

// DRPolicy to Subscription applications count
const countDRPolicyToSubscriptions = (
  subsMap: SubscriptionsToPlacementsMap,
  protectedPlacementMap: ProtectedPlacementMap
): DRPolicyToAppCount => {
  const drPolicyToSubsAppCount: DRPolicyToAppCount = {};
  Object.values(subsMap).forEach((placementUniqueNames) => {
    const drPolicyNames = new Set<string>();
    placementUniqueNames.forEach((placementUniqueName) => {
      // Check placementUniqueName is present on the protected placement map
      if (protectedPlacementMap.hasOwnProperty(placementUniqueName)) {
        const drpc = protectedPlacementMap[placementUniqueName];
        drPolicyNames.add(drpc.spec.drPolicyRef.name);
      }
    });

    //Application-wise DRPolicy list.
    // To resolve the corner case, Different Placement/PlacementRule of the same application is protected by a different DRPolicy.
    drPolicyNames.forEach((name) => {
      drPolicyToSubsAppCount[name] = (drPolicyToSubsAppCount[name] || 0) + 1;
    });
  });
  return drPolicyToSubsAppCount;
};

// Aggregates the result of all application types.
const aggregateDRPolicyCounts = ({
  drPolicyToDiscoveredAppsCount,
  drPolicyToAppsetCount,
  drPolicyToSubsAppCount,
}): DRPolicyToAppCount => {
  const allDRPolicyNames = new Set([
    ...Object.keys(drPolicyToDiscoveredAppsCount),
    ...Object.keys(drPolicyToAppsetCount),
    ...Object.keys(drPolicyToSubsAppCount),
  ]);

  const drPolicyToAppCount: DRPolicyToAppCount = {};

  allDRPolicyNames.forEach((name) => {
    drPolicyToAppCount[name] =
      (drPolicyToDiscoveredAppsCount[name] || 0) +
      (drPolicyToAppsetCount[name] || 0) +
      (drPolicyToSubsAppCount[name] || 0);
  });

  return drPolicyToAppCount;
};

export const useProtectedApplicationsWatch: UseProtectedApplicationsWatch =
  () => {
    const response = useK8sWatchResources<WatchResourceType>(getResources());

    const {
      data: appSets,
      loaded: appSetsLoaded,
      loadError: appSetsLoadError,
    } = response?.applicationSets;

    const {
      data: subscriptions,
      loaded: subscriptionsLoaded,
      loadError: subscriptionsLoadError,
    } = response?.subscriptions;

    const {
      data: drpcs,
      loaded: drpcsLoaded,
      loadError: drpcsLoadError,
    } = response?.drPlacementControls;

    const drpcLoadedWOError = drpcsLoaded && !drpcsLoadError;
    const subsLoadedWOError = subscriptionsLoaded && !subscriptionsLoadError;
    const appSetsLoadedWOError = appSetsLoaded && !appSetsLoadError;
    const allLoadedWOError =
      drpcLoadedWOError && subsLoadedWOError && appSetsLoadedWOError;

    const [protectedPlacementMap, drPolicyToDiscoveredAppsCount] =
      React.useMemo(
        () => getProtectedPlacementMap(drpcLoadedWOError, drpcs),
        [drpcs, drpcLoadedWOError]
      );

    const drPolicyToAppsetCount = React.useMemo(
      () =>
        countDRPolicyToAppSets(
          appSetsLoadedWOError,
          appSets,
          protectedPlacementMap
        ),
      [appSets, appSetsLoadedWOError, protectedPlacementMap]
    );

    const drPolicyToSubsAppCount = React.useMemo(
      () =>
        countDRPolicyToSubscriptions(
          mapSubscriptionsToPlacements(subsLoadedWOError, subscriptions),
          protectedPlacementMap
        ),
      [subsLoadedWOError, subscriptions, protectedPlacementMap]
    );

    const drPolicyToAppCount = React.useMemo(
      () =>
        aggregateDRPolicyCounts({
          drPolicyToDiscoveredAppsCount,
          drPolicyToAppsetCount,
          drPolicyToSubsAppCount,
        }),
      [
        drPolicyToDiscoveredAppsCount,
        drPolicyToAppsetCount,
        drPolicyToSubsAppCount,
      ]
    );

    return [drPolicyToAppCount, allLoadedWOError];
  };
type UseProtectedApplicationsWatch = () => UseApplicationsWatchReturnType;

type UseApplicationsWatchReturnType = [
  drPolicyToAppCount: DRPolicyToAppCount,
  loadedWOError: boolean,
];

type WatchResourceType = {
  applicationSets: ArgoApplicationSetKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

type SubscriptionsToPlacementsMap = { [appUniqueName: string]: Set<string> };

// Protected placement to DRPlacementControl mapping(one-to-one mapping).
type ProtectedPlacementMap = { [key: string]: DRPlacementControlKind };

// DRPolicy to protected application count(Subscription, ApplicationSet, Discovered)
export type DRPolicyToAppCount = { [key: string]: number };
