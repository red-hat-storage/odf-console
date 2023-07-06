import * as React from 'react';
import { PLACEMENT_REF_LABEL } from '@odf/mco/constants';
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
} from '@odf/mco/utils';
import { getNamespace } from '@odf/shared/selectors';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import * as _ from 'lodash-es';
import { AppManagePoliciesModal } from '../app-manage-policies-modal';
import {
  generateApplicationInfo,
  generateDRPlacementControlInfo,
  generateDRPolicyInfo,
  generatePlacementInfo,
} from '../utils/parser-utils';
import {
  ApplicationInfoType,
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

  const applicationInfo: ApplicationInfoType = React.useMemo(() => {
    let applicationInfo: ApplicationInfoType = {};
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
        getRemoteNamespaceFromAppSet(appSetResource?.application),
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
