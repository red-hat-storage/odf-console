import * as React from 'react';
import { APPLICATION_TYPE, PLACEMENT_REF_LABEL } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getDRClusterResourceObj,
  getDRPlacementControlResourceObj,
  getDRPolicyResourceObj,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  useArgoApplicationSetResourceWatch,
  useDisasterRecoveryResourceWatch,
} from '@odf/mco/hooks';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import {
  findPlacementNameFromAppSet,
  getRemoteNamespaceFromAppSet,
  findDeploymentClusters,
} from '@odf/mco/utils';
import { getNamespace } from '@odf/shared/selectors';
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
} from '../utils/types';

const getDRResources = (namespace: string) => ({
  resources: {
    drPolicies: getDRPolicyResourceObj(),
    drClusters: getDRClusterResourceObj(),
    drPlacementControls: getDRPlacementControlResourceObj({
      namespace: namespace,
    }),
  },
});

const getApplicationSetResources = (
  appResource: ArgoApplicationSetKind,
  namespace: string,
  placementName: string,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  resources: {
    placements: getPlacementResourceObj({
      name: placementName,
      namespace: namespace,
    }),
    placementDecisions: getPlacementDecisionsResourceObj({
      namespace: namespace,
      selector: { matchLabels: { [PLACEMENT_REF_LABEL]: placementName } },
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
    managedClusters: {
      data: {},
      loaded: true,
      loadError: '',
    },
  },
});

export const ApplicationSetParser: React.FC<ApplicationSetParserProps> = ({
  application,
  isOpen,
  close,
}) => {
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(getNamespace(application))
  );
  const [appSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(
        application,
        getNamespace(application),
        findPlacementNameFromAppSet(application),
        drResources,
        drLoaded,
        drLoadError
      )
    );
  const appSetResource = appSetResources?.formattedResources?.[0];
  const { drPolicies } = drResources;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
    if (loaded && !loadError) {
      // Today appset support maximum one placement, DRPC, DRPolicy per app.
      // When it support multi placement, need to change logic to,
      // group all DRPC using DRPolicy
      const { placement, placementDecision, drPlacementControl, drPolicy } =
        appSetResource.placements[0];

      const placementInfo = generatePlacementInfo(
        placement,
        findDeploymentClusters(placementDecision, drPlacementControl)
      );
      const drpcInfo: DRPlacementControlType[] = generateDRPlacementControlInfo(
        drPlacementControl,
        placementInfo
      );
      applicationInfo = generateApplicationInfo(
        APPLICATION_TYPE.APPSET,
        application,
        getRemoteNamespaceFromAppSet(application),
        // Skip placement if it already DR protected
        _.isEmpty(drpcInfo) ? [placementInfo] : [],
        generateDRInfo(drPolicy, drpcInfo)
      );
    }
    return applicationInfo;
  }, [application, appSetResource, loaded, loadError]);

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

type ApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
  isOpen: boolean;
  close: () => void;
};
