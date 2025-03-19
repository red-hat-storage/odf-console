import * as React from 'react';
import { DRApplication, PLACEMENT_REF_LABEL } from '@odf/mco/constants';
import {
  DisasterRecoveryResourceKind,
  getPlacementDecisionsResourceObj,
  getPlacementResourceObj,
  useArgoApplicationSetResourceWatch,
  useDisasterRecoveryResourceWatch,
  getApplicationSetResourceObj,
} from '@odf/mco/hooks';
import { ArgoApplicationSetKind } from '@odf/mco/types';
import {
  findPlacementNameFromAppSet,
  getRemoteNamespaceFromAppSet,
  findDeploymentClusters,
} from '@odf/mco/utils';
import { useDeepCompareMemoize } from '@odf/shared';
import { getName, getNamespace } from '@odf/shared/selectors';
import * as _ from 'lodash-es';
import { ModalContextViewer } from '../modal-context-viewer';
import {
  generateApplicationInfo,
  generateDRPlacementControlInfo,
  generateDRInfo,
  generatePlacementInfo,
  getMatchingDRPolicies,
  getDRResources,
} from '../utils/parser-utils';
import { ModalViewContext } from '../utils/reducer';
import {
  ApplicationInfoType,
  ApplicationType,
  DRPlacementControlType,
  DRPolicyType,
  PVCQueryFilter,
} from '../utils/types';

const getApplicationSetResources = (
  appResource: ArgoApplicationSetKind,
  namespace: string,
  placementName: string,
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any,
  isWatchApplication: boolean
) => ({
  resources: {
    ...(isWatchApplication
      ? {
          applications: getApplicationSetResourceObj({
            name: getName(appResource),
            namespace,
          }),
          placements: getPlacementResourceObj({
            namespace: namespace,
          }),
          placementDecisions: getPlacementDecisionsResourceObj({
            namespace: namespace,
          }),
        }
      : {
          placements: getPlacementResourceObj({
            name: placementName,
            namespace: namespace,
          }),
          placementDecisions: getPlacementDecisionsResourceObj({
            namespace: namespace,
            selector: { matchLabels: { [PLACEMENT_REF_LABEL]: placementName } },
          }),
        }),
  },
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
  overrides: {
    ...(!isWatchApplication
      ? {
          applications: {
            data: appResource,
            loaded: true,
            loadError: '',
          },
        }
      : {}),
    managedClusters: {
      data: {},
      loaded: true,
      loadError: '',
    },
  },
});

export const ApplicationSetParser: React.FC<ApplicationSetParserProps> = ({
  application,
  isWatchApplication,
  pvcQueryFilter,
  setCurrentModalContext,
}) => {
  const namespace = getNamespace(application);
  const [drResources, drLoaded, drLoadError] = useDisasterRecoveryResourceWatch(
    getDRResources(namespace)
  );
  const [appSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(
        application,
        namespace,
        findPlacementNameFromAppSet(application),
        drResources,
        drLoaded,
        drLoadError,
        isWatchApplication
      )
    );

  // Perform deep comparison to prevent unnecessary re-renders
  const appSetResource = useDeepCompareMemoize(
    appSetResources?.formattedResources?.[0]
  );

  const { drPolicies } = drResources;

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
    if (loaded && !loadError) {
      // Today appset support maximum one placement, DRPC, DRPolicy per app.
      // When it support multi placement, need to change logic to,
      // group all DRPC using DRPolicy
      const { placement, placementDecision, drPlacementControl, drPolicy } =
        appSetResource.placements[0];

      const deploymentClusters = findDeploymentClusters(
        placementDecision,
        drPlacementControl
      );

      const placementInfo = generatePlacementInfo(
        placement,
        deploymentClusters
      );
      const drpcInfo: DRPlacementControlType[] = generateDRPlacementControlInfo(
        drPlacementControl,
        placementInfo
      );

      const remoteNamespace = getRemoteNamespaceFromAppSet(
        appSetResource.application
      );

      applicationInfo = generateApplicationInfo(
        DRApplication.APPSET,
        appSetResource.application,
        remoteNamespace,
        // Skip placement if it already DR protected
        _.isEmpty(drpcInfo) ? [placementInfo] : [],
        generateDRInfo(drPolicy, drpcInfo),
        pvcQueryFilter || [
          {
            property: 'namespace',
            values: remoteNamespace,
          },
          {
            property: 'cluster',
            values: deploymentClusters,
          },
          {
            property: 'kind',
            values: ['pod', 'deployment', 'replicaset'],
          },
        ]
      );
    }
    return applicationInfo;
  }, [appSetResource, loaded, loadError, pvcQueryFilter]);

  const matchingPolicies: DRPolicyType[] = React.useMemo(
    () =>
      !_.isEmpty(applicationInfo)
        ? getMatchingDRPolicies(applicationInfo as ApplicationType, drPolicies)
        : [],
    [applicationInfo, drPolicies]
  );

  return (
    <ModalContextViewer
      applicationInfo={applicationInfo}
      matchingPolicies={matchingPolicies}
      loaded={loaded}
      loadError={loadError}
      setCurrentModalContext={setCurrentModalContext}
    />
  );
};

type ApplicationSetParserProps = {
  application: ArgoApplicationSetKind;
  // Always watch the application resource
  isWatchApplication?: boolean;
  // Current active modal context
  setCurrentModalContext: React.Dispatch<
    React.SetStateAction<ModalViewContext>
  >;
  // ACM search api PVC query filter
  pvcQueryFilter?: PVCQueryFilter;
};
