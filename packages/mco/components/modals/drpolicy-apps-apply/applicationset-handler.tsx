import * as React from 'react';
import { useK8sGet } from '@odf/shared/hooks/k8s-get-hook';
import { arrayify } from '@odf/shared/modals/EditLabelModal';
import { getName, getNamespace, getAnnotations } from '@odf/shared/selectors';
import { ListKind } from '@odf/shared/types';
import { referenceForModel } from '@odf/shared/utils';
import * as _ from 'lodash-es';
import { HUB_CLUSTER_NAME } from '../../../constants';
import {
  ArgoApplicationSetModel,
  ACMPlacementModel,
  ACMPlacementDecisionModel,
} from '../../../models';
import {
  ArgoApplicationSetKind,
  ACMPlacementKind,
  ACMPlacementDecisionKind,
  DRPlacementControlKind,
  PlacementToAppSets,
  PlacementToDrpcMap,
} from '../../../types';
import {
  matchClusters,
  findPlacementNameFromAppSet,
  findPlacementDecisionUsingPlacement,
  getGVKFromObjectRef,
} from '../../../utils';
import { ApplyPolicyAction, ApplyPolicyType } from './reducer';

const getAppSets = (
  pl: ACMPlacementKind,
  appSets: ArgoApplicationSetKind[]
): string[] =>
  appSets
    .filter(
      (appSet: ArgoApplicationSetKind) =>
        getNamespace(appSet) === getNamespace(pl) &&
        findPlacementNameFromAppSet(appSet) === getName(pl)
    )
    .map((appSet: ArgoApplicationSetKind) => getName(appSet));

const getPlsDecisionAndClusters = (
  pl: ACMPlacementKind,
  plsDecisions: ACMPlacementDecisionKind[]
): [string, string[]] => {
  const plsDecision = findPlacementDecisionUsingPlacement(pl, plsDecisions);
  return [
    getName(plsDecision),
    plsDecision?.status?.decisions.map((decision) => decision?.clusterName),
  ];
};

const getDRPlacementControl = (
  pl: ACMPlacementKind,
  drplcontrols: DRPlacementControlKind[]
): [string, string, string[]] => {
  const plDrpc = drplcontrols.find(
    (drplcontrol) =>
      getNamespace(drplcontrol) === getNamespace(pl) &&
      drplcontrol?.spec?.placementRef?.name === getName(pl) &&
      referenceForModel(ACMPlacementModel) ===
        getGVKFromObjectRef(drplcontrol?.spec?.placementRef)
  );
  return [
    getName(plDrpc),
    plDrpc?.spec?.drPolicyRef?.name,
    arrayify(plDrpc?.spec?.pvcSelector?.matchLabels),
  ];
};

const setDrpcPvcLabels = (
  pls: ACMPlacementKind[],
  drplcontrols: DRPlacementControlKind[],
  drpcPvcLabels: PlacementToDrpcMap
): void =>
  pls.forEach((pl: ACMPlacementKind) => {
    const [drpcName, drPolicyName, existingLabels] = getDRPlacementControl(
      pl,
      drplcontrols
    );
    if (!!drpcName) {
      !drpcPvcLabels.hasOwnProperty(getNamespace(pl)) &&
        (drpcPvcLabels[pl?.metadata.namespace] = {});
      drpcPvcLabels[getNamespace(pl)][getName(pl)] = {
        drpcName,
        drPolicyName,
        existingLabels,
        updateLabels: existingLabels,
      };
    }
  });

const getProtectedAndAvailableResources = (
  appSets: ArgoApplicationSetKind[],
  pls: ACMPlacementKind[],
  plsDecisions: ACMPlacementDecisionKind[],
  drClusterNames: string[],
  drPolicyName: string,
  drpcPvcLabels: PlacementToDrpcMap
) => {
  const protectedResources: PlacementToAppSets[] = [];
  const availableResources: PlacementToAppSets[] = [];

  pls.forEach((pl: ACMPlacementKind) => {
    const [placementDecision, decisionClusters] = getPlsDecisionAndClusters(
      pl,
      plsDecisions
    );

    const isAlreadyProtected: boolean =
      !!drpcPvcLabels[getNamespace(pl)]?.[getName(pl)]?.drpcName;
    const drPolicyRefName =
      drpcPvcLabels[getNamespace(pl)]?.[getName(pl)]?.drPolicyName;
    const isDRPolicyMatching = isAlreadyProtected
      ? drPolicyRefName === drPolicyName
      : true;
    if (
      !!matchClusters(drClusterNames, decisionClusters) &&
      isDRPolicyMatching
    ) {
      const resourcesMapRef: PlacementToAppSets[] = isAlreadyProtected
        ? protectedResources
        : availableResources;
      const appSetNames: string[] = getAppSets(pl, appSets);
      appSetNames.forEach((appSetName) =>
        resourcesMapRef.push({
          namespace: getNamespace(pl),
          placement: getName(pl),
          havePlacementAnnotations: !_.isEmpty(getAnnotations(pl)),
          isAlreadyProtected,
          appSetName,
          placementDecision,
          decisionClusters,
          selected: false,
          isVisible: true,
        })
      );
    }
  });

  return { protectedResources, availableResources };
};

export const useAppSetTypeResources = (
  drplcontrols: DRPlacementControlKind[],
  drClusterNames: string[],
  drPolicyName: string,
  dispatch: React.Dispatch<ApplyPolicyAction>
) => {
  const [applicationSets, applicationSetsLoaded, applicationSetsError] =
    useK8sGet<ListKind<ArgoApplicationSetKind>>(
      ArgoApplicationSetModel,
      null,
      null,
      HUB_CLUSTER_NAME
    );
  const [placements, placementsLoaded, placementsError] = useK8sGet<
    ListKind<ACMPlacementKind>
  >(ACMPlacementModel, null, null, HUB_CLUSTER_NAME);
  const [
    placementDecisions,
    placementDecisionsLoaded,
    placementDecisionsError,
  ] = useK8sGet<ListKind<ACMPlacementDecisionKind>>(
    ACMPlacementDecisionModel,
    null,
    null,
    HUB_CLUSTER_NAME
  );

  /**
   * setting up the initial state (should be set only once) --
   * 1. with one on one mapping of Placement to DRPlacementControl per Namespace.
   * 2. with one on one mapping of Placement to ApplicationSets/PlacementDisicions per Namespace.
   * */
  React.useEffect(() => {
    const pls: ACMPlacementKind[] = placements?.items;

    // 1. Placement to DRPlacementControl mapping
    const drpcPvcLabels: PlacementToDrpcMap = {};
    if (!!drplcontrols?.length && !!pls?.length) {
      setDrpcPvcLabels(pls, drplcontrols, drpcPvcLabels);
      dispatch({
        type: ApplyPolicyType.SET_DRPC_PVC_LABELS,
        payload: drpcPvcLabels,
      });
    }

    // 2. Placement to ApplicationSets/PlacementDisicions mapping
    const appSets: ArgoApplicationSetKind[] = applicationSets?.items;
    const plsDecisions: ACMPlacementDecisionKind[] = placementDecisions?.items;
    if (!!appSets?.length && !!pls?.length && !!plsDecisions?.length) {
      const { protectedResources, availableResources } =
        getProtectedAndAvailableResources(
          appSets,
          pls,
          plsDecisions,
          drClusterNames,
          drPolicyName,
          drpcPvcLabels
        );
      dispatch({
        type: ApplyPolicyType.SET_PROTECTED_RESOURCES,
        payload: protectedResources,
      });
      dispatch({
        type: ApplyPolicyType.SET_AVAILABLE_RESOURCES,
        payload: availableResources,
      });
    }
  }, [
    drplcontrols,
    applicationSets,
    placements,
    placementDecisions,
    drClusterNames,
    drPolicyName,
    dispatch,
  ]);

  return [
    applicationSetsLoaded && placementsLoaded && placementDecisionsLoaded,
    applicationSetsError || placementsError || placementDecisionsError,
  ];
};
