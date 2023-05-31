/* To find ApplicationSet's DR hierarchy*/

import * as React from 'react';
import { getName, getNamespace } from '@odf/shared/selectors';
import { WatchK8sResultsObject } from '@openshift-console/dynamic-plugin-sdk';
import {
  ArgoApplicationSetKind,
  ACMPlacementDecisionKind,
  ACMPlacementKind,
  ApplicationResourceType,
} from '../types';
import {
  findSiblingArgoAppSetsFromPlacement,
  findPlacementFromArgoAppSet,
  findPlacementDecisionUsingPlacement,
  findDRResourceUsingPlacement,
} from '../utils';
import { DRParserResultsType } from './disaster-recovery';

export const useArgoAppSetResourceParser: UseArgoAppSetResourceParserType = (
  props
) => {
  const {
    data: placements,
    loaded: placementsLoaded,
    loadError: placementsLoadError,
  } = props?.resources?.placements || {};

  const {
    data: placementDecisions,
    loaded: placementDecisionsLoaded,
    loadError: placementDecisionsLoadError,
  } = props?.resources?.placementDecisions || {};

  const {
    data: applications,
    loaded: applicationsLoaded,
    loadError: applicationsLoadError,
  } = props?.resources?.applications || {};

  const {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  } = props?.resources?.drResources || {};

  const filterByAppName = props?.conditions?.filterByAppName;

  const loaded =
    placementsLoaded &&
    placementDecisionsLoaded &&
    applicationsLoaded &&
    drLoaded;

  const loadError =
    placementsLoadError ||
    placementDecisionsLoadError ||
    applicationsLoadError ||
    drLoadError;

  return React.useMemo(() => {
    let argoAppSetResources: ApplicationResourceType[] = [];
    if (loaded && !loadError) {
      const appList = Array.isArray(applications)
        ? applications
        : [applications];
      const placementList = Array.isArray(placements)
        ? placements
        : [placements];
      const placementDecisionList = Array.isArray(placementDecisions)
        ? placementDecisions
        : [placementDecisions];
      appList.forEach((application) => {
        if (!filterByAppName || getName(application) === filterByAppName) {
          // For now ACM is supporting one placement per ApplicationSet
          const placement = findPlacementFromArgoAppSet(
            placementList,
            application
          );
          const drResource = findDRResourceUsingPlacement(
            getName(placement),
            getNamespace(placement),
            drResources
          );
          argoAppSetResources.push({
            applicationInfo: {
              application,
              deploymentInfo: [
                {
                  placementInfo: {
                    placement,
                    placementDecision: findPlacementDecisionUsingPlacement(
                      placement,
                      placementDecisionList
                    ),
                  },
                  drInfo: {
                    drPolicy: drResource?.drPolicy,
                    drClusters: drResource?.drClusters,
                    drPlacementControl: drResource?.drPlacementControls?.[0],
                  },
                },
              ],
            },
            siblingApplications: findSiblingArgoAppSetsFromPlacement(
              filterByAppName,
              placement,
              appList
            ),
          });
        }
      });
    }

    return {
      data: argoAppSetResources,
      loaded,
      loadError,
    };
  }, [
    applications,
    placements,
    placementDecisions,
    drResources,
    filterByAppName,
    loaded,
    loadError,
  ]);
};

type ParserResources = {
  resources?: {
    applications?: WatchK8sResultsObject<
      ArgoApplicationSetKind | ArgoApplicationSetKind[]
    >;
    placements?: WatchK8sResultsObject<ACMPlacementKind | ACMPlacementKind[]>;
    placementDecisions?: WatchK8sResultsObject<
      ACMPlacementDecisionKind | ACMPlacementDecisionKind[]
    >;
    drResources?: DRParserResultsType;
  };
  conditions?: {
    filterByAppName: string;
  };
};

type ArgoAppSetParserResultsType = {
  data: ApplicationResourceType[];
  loaded: boolean;
  loadError: any;
};

export type UseArgoAppSetResourceParserType = (
  resource?: ParserResources
) => ArgoAppSetParserResultsType;
