import * as React from 'react';
import { DRPC_STATUS, PLACEMENT_REF_LABEL } from '@odf/mco/constants';
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
import {
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ArgoApplicationSetKind,
  DRClusterKind,
  DRPlacementControlKind,
  DRPolicyKind,
} from '@odf/mco/types';
import {
  getClustersFromPlacementDecision,
  findDRType,
  findPlacementNameFromAppSet,
  getRemoteNamespaceFromAppSet,
  isDRPolicyValidated,
} from '@odf/mco/utils';
import { getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { TFunction } from 'i18next';
import * as _ from 'lodash-es';
import { AppManagePoliciesModal } from '../app-manage-policies-modal';
import {
  ApplicationType,
  DRPlacementControlType,
  DRPolicyType,
  PlacementType,
} from '../utils/types';

const getCurrentActivity = (currentStatus: string, t: TFunction) => {
  let status = '';
  if (currentStatus === DRPC_STATUS.Relocating) {
    status = t('Relocate in progress');
  } else if (currentStatus === DRPC_STATUS.FailingOver) {
    status = t('Failover in progress');
  }
  return status;
};

const generateDRPolicyInfo = (
  t: TFunction,
  drPolicy: DRPolicyKind,
  drClusters: DRClusterKind[],
  drpcInfo?: DRPlacementControlType[]
): DRPolicyType[] =>
  !_.isEmpty(drPolicy)
    ? [
        {
          apiVersion: drPolicy.apiVersion,
          kind: drPolicy.kind,
          metadata: drPolicy.metadata,
          // TODO: For multiple DRPC find least recently created
          assignedOn: drpcInfo?.[0]?.metadata?.creationTimestamp,
          // TODO: For multiple DRPC summarize the activity
          activity: getCurrentActivity(drpcInfo?.[0]?.status, t),
          isValidated: isDRPolicyValidated(drPolicy),
          schedulingInterval: drPolicy.spec.schedulingInterval,
          replicationType: findDRType(drClusters),
          drClusters: drPolicy.spec.drClusters,
          placementControInfo: drpcInfo,
        },
      ]
    : [];

const generatePlacementInfo = (
  placement: ACMPlacementKind,
  placementDecision: ACMPlacementDecisionKind
): PlacementType =>
  !_.isEmpty(placement)
    ? {
        apiVersion: placement.apiVersion,
        kind: placement.kind,
        metadata: placement.metadata,
        deploymentClusters: getClustersFromPlacementDecision(placementDecision),
      }
    : {};

const generateDRPlacementControlInfo = (
  drpc: DRPlacementControlKind,
  plsInfo: PlacementType
): DRPlacementControlType[] =>
  !_.isEmpty(drpc)
    ? [
        {
          apiVersion: drpc.apiVersion,
          kind: drpc.kind,
          metadata: drpc.metadata,
          drPolicyRef: drpc.spec.drPolicyRef,
          placementInfo: plsInfo,
          pvcSelector: drpc.spec?.pvcSelector,
          lastGroupSyncTime: drpc?.status?.lastGroupSyncTime,
          status: drpc?.status?.phase,
        },
      ]
    : [];

const generateApplicationInfo = (
  application: ArgoApplicationSetKind,
  plsInfo: PlacementType[],
  drPolicyInfo: DRPolicyType[]
): ApplicationType =>
  !_.isEmpty(application)
    ? {
        apiVersion: application.apiVersion,
        kind: application.kind,
        metadata: application.metadata,
        workloadNamespace: getRemoteNamespaceFromAppSet(application),
        placements: plsInfo,
        dataPolicies: drPolicyInfo,
      }
    : {};

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
  const { t } = useCustomTranslation();
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

  const applicationInfo: ApplicationType = React.useMemo(() => {
    let applicationInfo: ApplicationType = {};
    if (loaded && !loadError) {
      // Today appset support maximum one placement, DRPC, DRPolicy per app.
      // When it support multi placement, need to change logic to,
      // group all DRPC using DRPolicy
      const {
        placement,
        placementDecision,
        drPlacementControl,
        drPolicy,
        drClusters,
      } = appSetResource?.placements?.[0] || {};
      const placementInfo = generatePlacementInfo(placement, placementDecision);
      const drpcInfo: DRPlacementControlType[] = generateDRPlacementControlInfo(
        drPlacementControl,
        placementInfo
      );
      const drPolicyInfo: DRPolicyType[] = generateDRPolicyInfo(
        t,
        drPolicy,
        drClusters,
        drpcInfo
      );
      applicationInfo = generateApplicationInfo(
        appSetResource?.application,
        // Skip placement if it already DR protected
        _.isEmpty(drpcInfo) ? [placementInfo] : [],
        drPolicyInfo
      );
    }
    return applicationInfo;
  }, [appSetResource, loaded, loadError, t]);

  return (
    <AppManagePoliciesModal
      applicaitonInfo={applicationInfo}
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
