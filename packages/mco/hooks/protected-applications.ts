import * as React from 'react';
import { getLabel, getNamespace } from '@odf/shared/selectors';
import { useK8sWatchResources } from '@openshift-console/dynamic-plugin-sdk';
import { DISCOVERED_APP_NS } from '../constants';
import { ACMPlacementModel } from '../models';
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

    const drpcLoadedWAError = drpcsLoaded && !drpcsLoadError;
    const subsLoadedWAError = subscriptionsLoaded && !subscriptionsLoadError;
    const appSetsLoadedWAError = appSetsLoaded && !appSetsLoadError;

    const [protectedPlacementMap, drPolicyToDiscoveredAppsCount]: [
      ProtectedPlacementMap,
      DRPolicyToAppCount
    ] = React.useMemo(() => {
      const protectedPlacementMap: ProtectedPlacementMap = {};
      const drPolicyToDiscoveredAppsCount: DRPolicyToAppCount = {};
      if (drpcLoadedWAError) {
        drpcs?.forEach((drpc) => {
          const placementRef = drpc.spec.placementRef;
          const namespace = getNamespace(drpc);
          const placementUniqueName = getPlacementUniqueName(
            placementRef.name,
            placementRef.kind,
            namespace
          );
          protectedPlacementMap[placementUniqueName] = drpc;

          if (namespace === DISCOVERED_APP_NS) {
            const drPolicyName = drpc.spec.drPolicyRef.name;
            drPolicyToDiscoveredAppsCount[drPolicyName] =
              (drPolicyToDiscoveredAppsCount?.[drPolicyName] || 0) + 1;
          }
        });
      }
      return [protectedPlacementMap, drPolicyToDiscoveredAppsCount];
    }, [drpcs, drpcLoadedWAError]);

    const drPolicyToAppsetCount = React.useMemo((): DRPolicyToAppCount => {
      const drPolicyToAppsetCount: DRPolicyToAppCount = {};
      if (appSetsLoadedWAError) {
        appSets?.forEach((appSet) => {
          const placementName = findPlacementNameFromAppSet(appSet);
          const placementUniqueName = getPlacementUniqueName(
            placementName,
            ACMPlacementModel.kind,
            getNamespace(appSet)
          );

          if (protectedPlacementMap.hasOwnProperty(placementUniqueName)) {
            const drpc = protectedPlacementMap[placementUniqueName];
            const drPolicyName = drpc?.spec.drPolicyRef.name;
            drPolicyToAppsetCount[drPolicyName] =
              (drPolicyToAppsetCount?.[drPolicyName] || 0) + 1;
          }
        });
      }
      return drPolicyToAppsetCount;
    }, [appSets, protectedPlacementMap, appSetsLoadedWAError]);

    const drPolicyToSubsAppCount = React.useMemo((): DRPolicyToAppCount => {
      const drPolicyToSubsAppCount: DRPolicyToAppCount = {};
      if (subsLoadedWAError) {
        const subsMap: { [name: string]: string[] } = {};
        subscriptions?.forEach((subscription) => {
          if (isPlacementModel(subscription)) {
            const applicationName = getLabel(subscription, 'app');
            const appUniqueName = `${applicationName}-${getNamespace(
              subscription
            )}`;
            const placementRef = subscription.spec.placement.placementRef;
            const placementUniqueName = getPlacementUniqueName(
              placementRef.name,
              placementRef.kind,
              getNamespace(subscription)
            );
            if (!subsMap.hasOwnProperty(appUniqueName)) {
              subsMap[appUniqueName] = [];
            }
            subsMap[appUniqueName].push(placementUniqueName);
          }
        });

        Object.values(subsMap).forEach((placementUniqueNames) => {
          const drPolicyNames = new Set<string>();
          placementUniqueNames.forEach((placementUniqueName) => {
            if (protectedPlacementMap.hasOwnProperty(placementUniqueName)) {
              const drpc = protectedPlacementMap[placementUniqueName];
              drPolicyNames.add(drpc.spec.drPolicyRef.name);
            }
          });

          drPolicyNames.forEach((name) => {
            if (!drPolicyToSubsAppCount.hasOwnProperty(name)) {
              drPolicyToSubsAppCount[name] = 0;
            }
            drPolicyToSubsAppCount[name] += 1;
          });
        });
      }
      return drPolicyToSubsAppCount;
    }, [subscriptions, subsLoadedWAError, protectedPlacementMap]);

    const drPolicyToAppCount = React.useMemo((): DRPolicyToAppCount => {
      const drPolicyToAppCount: DRPolicyToAppCount = {};
      const allDRPolicyNames = new Set([
        ...Object.keys(drPolicyToDiscoveredAppsCount),
        ...Object.keys(drPolicyToAppsetCount),
        ...Object.keys(drPolicyToSubsAppCount),
      ]);

      allDRPolicyNames.forEach((name) => {
        drPolicyToAppCount[name] =
          (drPolicyToDiscoveredAppsCount?.[name] || 0) +
          (drPolicyToAppsetCount?.[name] || 0) +
          (drPolicyToSubsAppCount?.[name] || 0);
      });

      return drPolicyToAppCount;
    }, [
      drPolicyToDiscoveredAppsCount,
      drPolicyToAppsetCount,
      drPolicyToSubsAppCount,
    ]);

    return [
      drPolicyToAppCount,
      appSetsLoadedWAError && subsLoadedWAError && drpcLoadedWAError,
    ];
  };

type UseProtectedApplicationsWatch = () => UseApplicationsWatchReturnType;

type UseApplicationsWatchReturnType = [
  drPolicyToAppCount: DRPolicyToAppCount,
  loadedWAError: boolean
];

type WatchResourceType = {
  applicationSets: ArgoApplicationSetKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

type ProtectedPlacementMap = { [key: string]: DRPlacementControlKind };

export type DRPolicyToAppCount = { [key: string]: number };
