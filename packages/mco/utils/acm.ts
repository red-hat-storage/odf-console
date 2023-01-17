import { getName, getNamespace } from '@odf/shared/selectors';
import { PLACEMENT_REF_LABEL } from '../constants';
import {
  ArgoApplicationSetKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
} from '../types';

// Finding placement from application generators
export const findPlacementNameFromAppSet = (
  application: ArgoApplicationSetKind
): string =>
  application?.spec?.generators[0]?.clusterDecisionResource?.labelSelector
    ?.matchLabels?.[PLACEMENT_REF_LABEL] || '';

export const findSiblingArgoAppSetsFromPlacement = (
  appName: String,
  placement: ACMPlacementKind,
  applications: ArgoApplicationSetKind[]
): ArgoApplicationSetKind[] =>
  applications?.filter(
    (application) =>
      appName !== getName(application) &&
      getNamespace(application) === getNamespace(placement) &&
      findPlacementNameFromAppSet(application) === getName(placement)
  );

export const findPlacementFromArgoAppSet = (
  placements: ACMPlacementKind[],
  application: ArgoApplicationSetKind
): ACMPlacementKind =>
  placements?.find(
    (placement) =>
      getNamespace(placement) === getNamespace(application) &&
      findPlacementNameFromAppSet(application) === getName(placement)
  );

export const findPlacementDecisionUsingPlacement = (
  placement: ACMPlacementKind,
  placementDecisions: ACMPlacementDecisionKind[]
) =>
  placementDecisions.find((placementDecision) =>
    placementDecision?.metadata?.ownerReferences?.find(
      (ownerReference) =>
        placement?.metadata?.uid === ownerReference?.uid &&
        getNamespace(placementDecision) === getNamespace(placement)
    )
  );
