import { getLabel, getName, getNamespace } from '@odf/shared/selectors';
import { PLACEMENT_REF_LABEL } from '../constants';
import {
  ArgoApplicationSetKind,
  ACMManagedClusterKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
} from '../types';

// Finding placement from application generators
export const findPlacementNameFromAppSet = (
  application: ArgoApplicationSetKind
): string =>
  application?.spec?.generators?.[0]?.clusterDecisionResource?.labelSelector
    ?.matchLabels?.[PLACEMENT_REF_LABEL] || '';

export const findPlacementDecisionUsingPlacement = (
  placement: ACMPlacementKind,
  placementDecisions: ACMPlacementDecisionKind[]
) =>
  placementDecisions?.find(
    (placementDecision) =>
      getLabel(placementDecision, PLACEMENT_REF_LABEL, '') ===
        getName(placement) &&
      getNamespace(placementDecision) === getNamespace(placement)
  );

export const getManagedClusterAvailableCondition = (
  managedCluster: ACMManagedClusterKind
) =>
  managedCluster?.status?.conditions?.find(
    (condition) =>
      condition?.type === 'ManagedClusterConditionAvailable' &&
      condition.status === 'True'
  );

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

export const getClustersFromPlacementDecision = (
  placementDecision: ACMPlacementDecisionKind
): string[] =>
  placementDecision?.status?.decisions?.map(
    (decision) => decision?.clusterName
  );

export const getRemoteNamespaceFromAppSet = (
  application: ArgoApplicationSetKind
): string => application?.spec?.template?.spec?.destination?.namespace;
