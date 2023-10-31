import * as React from 'react';
import { APPLICATION_TYPE } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  useSubscriptionResourceWatch,
  useDisasterRecoveryResourceWatch,
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
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  application: appResource,
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
  const [subscriptionResources, loaded, loadError] =
    useSubscriptionResourceWatch(
      getSubscriptionResources(application, drResources, drLoaded, drLoadError)
    );
  const formattedDRResources = drResources?.formattedResources;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
    if (loaded && !loadError) {
      const unProtectedPlacements: PlacementType[] = [];
      const drPolicyToDPRCMap: DRPolicyToDRPCMap = {};
      subscriptionResources.forEach(
        ({
          placement,
          drClusters,
          drPlacementControl,
          drPolicy,
          placementDecision,
        }) => {
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
        application,
        APPLICATION_TYPE.SUBSCRIPTION,
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
