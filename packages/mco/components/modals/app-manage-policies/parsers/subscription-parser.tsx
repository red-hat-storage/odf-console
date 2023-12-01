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
import { ACMPlacementModel } from '@odf/mco/models';
import {
  ACMPlacementRuleKind,
  DRClusterKind,
  DRPolicyKind,
} from '@odf/mco/types';
import { getClustersFromDecisions } from '@odf/mco/utils';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ApplicationKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { AppManagePoliciesModal } from '../app-manage-policies-modal';
import {
  generateApplicationInfo,
  generateDRPlacementControlInfo,
  generateDRPolicyInfo,
  generatePlacementInfo,
  getMatchingDRPolicies,
} from '../utils/parser-utils';
import {
  ApplicationInfoType,
  ApplicationType,
  DRPlacementControlType,
  DRPolicyType,
  DataPolicyType,
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
  const { t } = useCustomTranslation();
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
  const formattedDRResources = drResources?.formattedResources;
  const subscriptionResources = subscriptionResourceList?.[0];

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
    if (loaded && !loadError) {
      const unProtectedPlacements: PlacementType[] = [];
      const drPolicyToDPRCMap: DRPolicyToDRPCMap = {};
      subscriptionResources?.subscriptionGroupInfo?.forEach(
        ({ placement, placementDecision, drInfo }) => {
          const { drClusters, drPlacementControl, drPolicy } = drInfo || {};
          const deploymentClusters: string[] =
            placement.kind === ACMPlacementModel.kind
              ? getClustersFromDecisions(placementDecision)
              : getClustersFromDecisions(placement as ACMPlacementRuleKind);
          const placementInfo = generatePlacementInfo(
            placement,
            deploymentClusters
          );
          const drpcInfo: DRPlacementControlType[] =
            generateDRPlacementControlInfo(drPlacementControl, placementInfo);
          if (!drpcInfo.length) {
            // Unprotected placement
            unProtectedPlacements.push(placementInfo);
          } else {
            // Protected placement
            const policyName = getName(drPolicy);
            drPolicyToDPRCMap[policyName] = {
              drClusters,
              drPolicy,
              drPlacementControls: [
                ...(drPolicyToDPRCMap?.[policyName]?.drPlacementControls || []),
                ...drpcInfo,
              ],
            };
          }
        }
      );
      const drPolicyInfo: DRPolicyType[] = Object.values(drPolicyToDPRCMap).map(
        ({ drClusters, drPlacementControls, drPolicy }) =>
          generateDRPolicyInfo(drPolicy, drClusters, drPlacementControls, t)[0]
      );
      applicationInfo = generateApplicationInfo(
        APPLICATION_TYPE.SUBSCRIPTION,
        application,
        getNamespace(application),
        unProtectedPlacements,
        drPolicyInfo
      );
    }
    return applicationInfo;
  }, [application, subscriptionResources, loaded, loadError, t]);

  const matchingPolicies: DataPolicyType[] = React.useMemo(
    () =>
      !_.isEmpty(applicationInfo)
        ? getMatchingDRPolicies(
            applicationInfo as ApplicationType,
            formattedDRResources
          )
        : [],
    [applicationInfo, formattedDRResources]
  );

  return (
    <AppManagePoliciesModal
      applicaitonInfo={applicationInfo}
      matchingPolicies={matchingPolicies}
      loaded={loaded}
      loadError={loadError}
      isOpen={isOpen}
      close={close}
    />
  );
};

type DRPolicyToDRPCMap = {
  [policyName: string]: {
    drPlacementControls: DRPlacementControlType[];
    drClusters: DRClusterKind[];
    drPolicy: DRPolicyKind;
  };
};

type SubscriptionParserProps = {
  application: ApplicationKind;
  isOpen: boolean;
  close: () => void;
};
