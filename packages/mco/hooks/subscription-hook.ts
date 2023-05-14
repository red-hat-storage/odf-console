import * as React from 'react';
import { getAPIVersion, getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  ACMPlacementModel,
  ACMPlacementRuleModel,
  ACMSubscriptionModel,
} from '../models';
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ACMSubscriptionKind,
  ACMPlacementRuleKind,
} from '../types';
import {
  getClusterNamesFromPlacement,
  getClusterNamesFromPlsRule,
  getPlacementKind,
  matchApplicationToSubscription,
  getPlacementUniqueId,
} from '../utils';
import {
  SubscriptionAppInfo,
  DisasterRecoveryInfoType,
  SubscriptionInfoType,
  PlacementInfoType,
} from './types';

const subscriptionAppFilter = (application: ApplicationKind) =>
  application?.spec?.componentKinds?.some(
    (componentKind) =>
      componentKind?.group === ACMSubscriptionModel?.apiGroup &&
      componentKind?.kind === ACMSubscriptionModel?.kind
  );

const getDRInfoUsingPlacement = (
  placement: PlacementInfoType,
  drInfoToNamespaceMap: DRInfoToNamespaceType
) =>
  drInfoToNamespaceMap?.[
    getPlacementUniqueId(
      getName(placement),
      getNamespace(placement),
      placement?.kind
    )
  ] || {};

const generateSubscriptionAppInfo = (
  application: ApplicationKind,
  subsToNamespaceMap: SubscriptionToNamespaceType,
  plsRuleToNamespaceMap: PlacementRuleToNamespaceType,
  plsToNamespaceMap: PlacementToNamespaceType,
  plDecisionToNamespaceMap: PlacementDecisionToNamespaceType
): SubscriptionAppInfo => {
  const appNamespace = getNamespace(application);
  const subscriptions =
    Object.values(subsToNamespaceMap?.[appNamespace] ?? {}) || [];
  const subscriptionInfo: SubscriptionInfoType[] = [];
  const plsToSubsMap: PlacementToSubscriptionType = {};
  subscriptions.forEach((subscription) => {
    // applying subscription filter from application
    if (matchApplicationToSubscription(subscription, application)) {
      const placementRefKind =
        subscription?.spec?.placement?.placementRef?.kind;
      const placementRefName =
        subscription?.spec?.placement?.placementRef?.name;
      const placementRefNamespace =
        subscription?.spec?.placement?.placementRef?.namespace ||
        getNamespace(subscription);
      const subscriptionMetaData: K8sResourceCommon = {
        apiVersion: getAPIVersion(subscription),
        kind: subscription?.kind,
        metadata: subscription?.metadata,
      };
      const uniqueId = getPlacementUniqueId(
        placementRefName,
        placementRefNamespace,
        placementRefKind
      );
      if (Object.keys(plsToSubsMap)?.includes(uniqueId)) {
        plsToSubsMap[uniqueId].push(subscriptionMetaData);
      } else {
        plsToSubsMap[uniqueId] = [subscriptionMetaData];
      }
    }
  });

  Object.entries(plsToSubsMap)?.forEach(([uniqueId, subsMetaData]) => {
    const [plsRefName, plsRefNamespace, plsRefKind] = uniqueId.split('%');
    if (plsRefKind === ACMPlacementRuleModel.kind) {
      // fetch placement rule using subscription
      const plsRule = plsRuleToNamespaceMap?.[plsRefNamespace]?.[plsRefName];
      !!plsRule &&
        subscriptionInfo.push({
          subscriptions: subsMetaData,
          placementInfo: {
            apiVersion: getAPIVersion(plsRule),
            kind: ACMPlacementRuleModel?.kind,
            metadata: plsRule?.metadata,
            deploymentClusters: getClusterNamesFromPlsRule(plsRule),
          },
        });
    } else if (plsRefKind === ACMPlacementModel.kind) {
      // fetch placement using subscription
      const placement = plsToNamespaceMap?.[plsRefNamespace]?.[plsRefName];
      const plsDecisions =
        Object.values(plDecisionToNamespaceMap?.[appNamespace] || {}) || [];
      !!placement &&
        subscriptionInfo.push({
          subscriptions: subsMetaData,
          placementInfo: {
            apiVersion: getAPIVersion(placement),
            kind: ACMPlacementModel.kind,
            metadata: placement?.metadata,
            deploymentClusters: getClusterNamesFromPlacement(
              placement,
              plsDecisions
            ),
          },
        });
    }
  });

  return {
    applicationInfo: {
      apiVersion: getAPIVersion(application),
      kind: application?.kind,
      metadata: application?.metadata,
    },
    subscriptionInfo: subscriptionInfo,
  };
};

export const useSubscriptionAppInfoParser: UseSubscriptionAppInfoParser = (
  resource
) => {
  const {
    applications,
    subscriptions,
    placementRules,
    placements,
    placementDecisions,
    disasterRecoveryInfo,
    loaded,
    loadError,
  } = resource;

  const subscriptionAppInfo: SubscriptionAppInfo[] = React.useMemo(() => {
    const subscriptionAppInfo: SubscriptionAppInfo[] = [];
    if (loaded && !loadError) {
      const apps = Array.isArray(applications) ? applications : [applications];
      // namespace wise Application object
      const appToNamespaceMap: ApplicationToNamespaceType = apps?.reduce(
        (arr, application) =>
          subscriptionAppFilter(application)
            ? {
                ...arr,
                [getNamespace(application)]: {
                  ...arr[getNamespace(application)],
                  [getName(application)]: application,
                },
              }
            : arr,
        {}
      );

      // namespace wise Subscription object
      const subsToNamespaceMap: SubscriptionToNamespaceType =
        subscriptions?.reduce(
          (arr, subscription) =>
            [ACMPlacementRuleModel?.kind, ACMPlacementModel?.kind].includes(
              getPlacementKind(subscription)
            )
              ? {
                  ...arr,
                  [getNamespace(subscription)]: {
                    ...arr[getNamespace(subscription)],
                    [getName(subscription)]: subscription,
                  },
                }
              : arr,
          {}
        );

      // namespace wise PlacementRule object
      const plsRuleToNamespaceMap: PlacementRuleToNamespaceType =
        placementRules?.reduce(
          (arr, placementRule) => ({
            ...arr,
            [getNamespace(placementRule)]: {
              ...arr[getNamespace(placementRule)],
              [getName(placementRule)]: placementRule,
            },
          }),
          {}
        );

      // namespace wise Placement object
      const plsToNamespaceMap: PlacementToNamespaceType = placements?.reduce(
        (arr, placement) => ({
          ...arr,
          [getNamespace(placement)]: {
            ...arr[getNamespace(placement)],
            [getName(placement)]: placement,
          },
        }),
        {}
      );

      // namespace wise PlacementDecision object
      const plDecisionToNamespaceMap: PlacementDecisionToNamespaceType =
        placementDecisions?.reduce(
          (arr, plDecision) => ({
            ...arr,
            [getNamespace(plDecision)]: {
              ...arr[getNamespace(plDecision)],
              [getName(plDecision)]: plDecision,
            },
          }),
          {}
        );

      Object.keys(appToNamespaceMap).forEach((namespace) => {
        Object.keys(appToNamespaceMap[namespace]).forEach((appName) => {
          subscriptionAppInfo.push(
            generateSubscriptionAppInfo(
              appToNamespaceMap[namespace][appName],
              subsToNamespaceMap,
              plsRuleToNamespaceMap,
              plsToNamespaceMap,
              plDecisionToNamespaceMap
            )
          );
        });
      });
    }
    return subscriptionAppInfo;
  }, [
    applications,
    subscriptions,
    placementRules,
    placements,
    placementDecisions,
    loaded,
    loadError,
  ]);

  React.useMemo(() => {
    if (!!subscriptionAppInfo?.length) {
      // update disaster recovery info
      const drInfoToNamespaceMap: DRInfoToNamespaceType =
        disasterRecoveryInfo?.reduce(
          (arr, drInfo) => ({
            ...arr,
            [getPlacementUniqueId(
              drInfo?.placementInfo?.name,
              drInfo?.placementInfo?.namespace,
              drInfo?.placementInfo?.kind
            )]: drInfo,
          }),
          {}
        );
      subscriptionAppInfo?.forEach((appInfo) => {
        appInfo?.subscriptionInfo?.forEach((subsInfo) => {
          subsInfo.disasterRecoveryInfo = getDRInfoUsingPlacement(
            subsInfo?.placementInfo,
            drInfoToNamespaceMap
          );
        });
      });
    }
  }, [subscriptionAppInfo, disasterRecoveryInfo]);
  return subscriptionAppInfo;
};

type SubsAppResourceParserType = {
  applications: ApplicationKind | ApplicationKind[];
  subscriptions: ACMSubscriptionKind[];
  placementRules?: ACMPlacementRuleKind[];
  placements?: ACMPlacementKind[];
  placementDecisions?: ACMPlacementDecisionKind[];
  disasterRecoveryInfo?: DisasterRecoveryInfoType[];
  loaded: boolean;
  loadError: boolean;
};

export type UseSubscriptionAppInfoParser = (
  props?: SubsAppResourceParserType
) => SubscriptionAppInfo[];

type ApplicationToNamespaceType = {
  [namespace in string]: {
    [app in string]: ApplicationKind;
  };
};

type SubscriptionToNamespaceType = {
  [namespace in string]: {
    [sub in string]: ACMSubscriptionKind;
  };
};

type PlacementRuleToNamespaceType = {
  [namespace in string]: {
    [plsRule in string]: ACMPlacementRuleKind;
  };
};

type PlacementToNamespaceType = {
  [namespace in string]: {
    [pls in string]: ACMPlacementKind;
  };
};

type PlacementDecisionToNamespaceType = {
  [namespace in string]: {
    [plDecision in string]: ACMPlacementDecisionKind;
  };
};

type DRInfoToNamespaceType = {
  [uniqueId in string]: DisasterRecoveryInfoType | {};
};

type PlacementToSubscriptionType = {
  [uniqueId in string]: K8sResourceCommon[];
};
