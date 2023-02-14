import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import {
  ObjectReference,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import { ACMPlacementModel, ACMPlacementRuleModel } from '../models';
import {
  ACMSubscriptionKind,
  ArgoApplicationSetKind,
  DRPlacementControlKind,
} from '../types';
import {
  matchApplicationToSubscription,
  findPlacementNameFromAppSet,
} from '../utils';
import {
  getApplicationResourceObj,
  getApplicationSetResourceObj,
  getDRPlacementControlResourceObj,
  getSubscriptionResourceObj,
} from './mco-resources';

const SubscriptionType = 'Subscription';
const ApplicaitonSetType = 'ApplicationSet';

const getResources = () => ({
  argoApplicationSets: getApplicationSetResourceObj(),
  applications: getApplicationResourceObj(),
  subscriptions: getSubscriptionResourceObj(),
  drPlacementControls: getDRPlacementControlResourceObj(),
});

const filterSubsUsingApplication = (
  subscriptionMapping: SubcsriptionMapping,
  app: ApplicationKind
): ACMSubscriptionKind[] => {
  const appNamespace = getNamespace(app);
  const namespcedSubscriptions = subscriptionMapping[appNamespace] || [];

  return namespcedSubscriptions.filter((subs) =>
    // applying subscription filter
    matchApplicationToSubscription(subs, app)
  );
};

const createSubsApplicationReferences = (
  loaded: boolean,
  applications: ApplicationKind[],
  subscriptions: ACMSubscriptionKind[]
) => {
  let applicationRefs: ApplicationRefKind[] = [];
  if (loaded) {
    // namespace wise subscriptions
    const subsMapping: SubcsriptionMapping = subscriptions?.reduce(
      (arr, sub) => ({
        ...arr,
        [getNamespace(sub)]: [...(arr?.[getNamespace(sub)] || []), sub],
      }),
      {}
    );
    applications?.forEach((application) => {
      const namespace = getNamespace(application);
      const filteredSubs = filterSubsUsingApplication(subsMapping, application);
      const placementRuleRefs: ObjectReference[] = filteredSubs?.map((sub) => ({
        apiVersion: `${ACMPlacementRuleModel.apiGroup}/${ACMPlacementRuleModel.apiVersion}`,
        kind: ACMPlacementRuleModel.kind,
        name: sub?.spec?.placement?.placementRef?.name,
        namespace,
      }));
      applicationRefs = !!placementRuleRefs?.length
        ? [
            ...applicationRefs,
            {
              applicationName: getName(application),
              applicationNamespace: namespace,
              applicationType: SubscriptionType,
              placementRef: placementRuleRefs,
              workLoadNamespace: namespace,
            },
          ]
        : applicationRefs;
    });
  }
  return applicationRefs;
};

const createApplicationSetReferences = (
  loaded: boolean,
  applications: ArgoApplicationSetKind[]
) => {
  let applicationRefs: ApplicationRefKind[] = [];
  if (loaded) {
    applications?.forEach((application) => {
      const namespace = getNamespace(application);
      applicationRefs = [
        ...applicationRefs,
        {
          applicationName: getName(application),
          applicationNamespace: namespace,
          applicationType: ApplicaitonSetType,
          placementRef: [
            {
              apiVersion: `${ACMPlacementModel.apiGroup}/${ACMPlacementModel.apiVersion}`,
              kind: ACMPlacementModel.kind,
              name: findPlacementNameFromAppSet(application),
              namespace,
            },
          ],
          // TODO change to workload namespace
          workLoadNamespace: namespace,
        },
      ];
    });
  }
  return applicationRefs;
};

export const findAndUpdateApplicationRef = (
  applicationRefs: ApplicationRefKind[],
  drpcs: DRPlacementControlKind[]
): ApplicationRefKind[] =>
  applicationRefs?.reduce((acc, appRef) => {
    const filteredDRPCs = drpcs?.filter((drpc) =>
      appRef?.placementRef?.find(
        (plsRef) =>
          drpc?.spec?.placementRef?.kind === plsRef?.kind &&
          drpc?.spec?.placementRef?.name === plsRef?.name &&
          drpc?.spec?.placementRef?.namespace === plsRef?.namespace
      )
    );
    if (!!filteredDRPCs?.length) {
      appRef.drPolicyRefs = filteredDRPCs?.map(
        (drpc) => drpc?.spec?.drPolicyRef?.name
      );
      acc = [...acc, appRef];
    }
    return acc;
  }, []);

export const useApplicationsWatch: UseApplicationsWatch = () => {
  const response = useK8sWatchResources<WatchResourceType>(getResources());

  const {
    data: argoAppSets,
    loaded: argoAppSetsLoaded,
    loadError: argoAppSetsLoadError,
  } = response?.argoApplicationSets;

  const {
    data: applications,
    loaded: applicationsLoaded,
    loadError: applicationsLoadError,
  } = response?.applications;

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

  const subsAppsloaded = applicationsLoaded && subscriptionsLoaded;
  const subsAppsloadError = applicationsLoadError || subscriptionsLoadError;
  const allLoaded = subsAppsloaded && argoAppSetsLoaded && drpcsLoaded;
  const allLoadError =
    subsAppsloadError || argoAppSetsLoadError || drpcsLoadError;

  const subsApplicationsRefs = React.useMemo(
    () =>
      createSubsApplicationReferences(
        subsAppsloaded && !subsAppsloadError,
        applications,
        subscriptions
      ),
    [applications, subscriptions, subsAppsloaded, subsAppsloadError]
  );

  const argoApplicationSetRefs = React.useMemo(
    () =>
      createApplicationSetReferences(
        argoAppSetsLoaded && !argoAppSetsLoadError,
        argoAppSets
      ),
    [argoAppSets, argoAppSetsLoaded, argoAppSetsLoadError]
  );

  const applicationsRefs = React.useMemo(
    () =>
      drpcsLoaded && !drpcsLoadError
        ? findAndUpdateApplicationRef(
            [...argoApplicationSetRefs, ...subsApplicationsRefs],
            drpcs
          )
        : [],
    [
      argoApplicationSetRefs,
      subsApplicationsRefs,
      drpcs,
      drpcsLoadError,
      drpcsLoaded,
    ]
  );

  return [applicationsRefs, allLoaded, allLoadError];
};

type WatchResourceType = {
  argoApplicationSets: ArgoApplicationSetKind[];
  applications: ApplicationKind[];
  subscriptions: ACMSubscriptionKind[];
  drPlacementControls: DRPlacementControlKind[];
};

type UseApplicationsWatch = () => [ApplicationRefKind[], boolean, any];

type SubcsriptionMapping = {
  [namespace in string]: ACMSubscriptionKind[];
};

export type ApplicationRefKind = {
  applicationName: string;
  applicationNamespace: string;
  applicationType: string;
  workLoadNamespace: string;
  drPolicyRefs?: string[];
  placementRef?: ObjectReference[];
};
