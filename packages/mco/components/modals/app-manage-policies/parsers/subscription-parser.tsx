import * as React from 'react';
import { APPLICATION_TYPE } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  useSubscriptionResourceWatch,
  useDisasterRecoveryResourceWatch,
  getPlacementResourceObj,
  getPlacementDecisionsResourceObj,
  getSubscriptionResourceObj,
  getPlacementRuleResourceObj,
} from '@odf/mco/hooks';
import { DRPolicyKind } from '@odf/mco/types';
import { findDeploymentClusters } from '@odf/mco/utils';
import { getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import * as _ from 'lodash-es';
import { AppManagePoliciesModal } from '../app-manage-policies-modal';
import {
  generateApplicationInfo,
  generateDRPlacementControlInfo,
  generateDRInfo,
  generatePlacementInfo,
  getMatchingDRPolicies,
} from '../utils/parser-utils';
import {
  ApplicationInfoType,
  ApplicationType,
  DRPlacementControlType,
  DRPolicyType,
  PlacementType,
} from '../utils/types';

const getDRResources = (namespace: string) => ({
  resources: {
    drPolicies: getDRPolicyResourceObj(),
    drClusters: getDRClusterResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace,
    }),
  },
});

const getSubscriptionResources = (
  appResource: ApplicationKind,
  namespace: string,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  resources: {
    subscriptions: getSubscriptionResourceObj({
      namespace,
    }),
    placementRules: getPlacementRuleResourceObj({
      namespace,
    }),
    placements: getPlacementResourceObj({
      namespace,
    }),
    placementDecisions: getPlacementDecisionsResourceObj({
      namespace,
    }),
  },
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  overrides: {
    applications: {
      data: appResource,
      loaded: true,
      loadError: '',
    },
  },
});

export const SubscriptionParser: React.FC<SubscriptionParserProps> = ({
  application,
  isOpen,
  close,
}) => {
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(getNamespace(application))
  );
  const [subscriptionResourceList, loaded, loadError] =
    useSubscriptionResourceWatch(
      getSubscriptionResources(
        application,
        getNamespace(application),
        drResources,
        drLoaded,
        drLoadError
      )
    );
  const subscriptionResources = subscriptionResourceList?.[0];
  const { drPolicies } = drResources;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
    if (loaded && !loadError) {
      const unProtectedPlacements: PlacementType[] = [];
      const drPlacementControls: DRPlacementControlType[] = [];
      let drPolicyInfo: DRPolicyKind = {};
      subscriptionResources?.subscriptionGroupInfo?.forEach(
        ({ placement, placementDecision, drInfo }) => {
          const { drPlacementControl, drPolicy } = drInfo || {};
          const deploymentClusters: string[] = findDeploymentClusters(
            placementDecision,
            drPlacementControl
          );
          const placementInfo = generatePlacementInfo(
            placement,
            deploymentClusters
          );
          if (_.isEmpty(drPlacementControl)) {
            // Unprotected placement
            unProtectedPlacements.push(placementInfo);
          } else {
            // Protected placement
            drPlacementControls.push(
              ...generateDRPlacementControlInfo(
                drPlacementControl,
                placementInfo
              )
            );
            // DRPolicy will be same for all subscription groups, its ok to override
            drPolicyInfo = drPolicy;
          }
        }
      );
      applicationInfo = generateApplicationInfo(
        APPLICATION_TYPE.SUBSCRIPTION,
        application,
        getNamespace(application),
        unProtectedPlacements,
        generateDRInfo(drPolicyInfo, drPlacementControls)
      );
    }
    return applicationInfo;
  }, [application, subscriptionResources, loaded, loadError]);

  const matchingPolicies: DRPolicyType[] = React.useMemo(
    () =>
      !_.isEmpty(applicationInfo)
        ? getMatchingDRPolicies(applicationInfo as ApplicationType, drPolicies)
        : [],
    [applicationInfo, drPolicies]
  );

  return (
    <AppManagePoliciesModal
      applicaitonInfo={applicationInfo as ApplicationType}
      matchingPolicies={matchingPolicies}
      loaded={loaded}
      loadError={loadError}
      isOpen={isOpen}
      close={close}
    />
  );
};

type SubscriptionParserProps = {
  application: ApplicationKind;
  isOpen: boolean;
  close: () => void;
};
