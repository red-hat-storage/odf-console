import * as React from 'react';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { getName } from '@odf/shared/selectors';
import { Grid, GridItem } from '@patternfly/react-core';
import { ACM_ENDPOINT, HUB_CLUSTER_NAME } from '../../../constants';
import {
  DisasterRecoveryResourceKind,
  useArgoApplicationSetResourceWatch,
  useDisasterRecoveryResourceWatch,
} from '../../../hooks';
import {
  DRClusterKind,
  ACMManagedClusterKind,
  DrClusterAppsMap,
} from '../../../types';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import { AlertsCard } from './alert-card/alert-card';
import { ClusterAppCard } from './cluster-app-card/cluster-app-card';
import { CSVStatusesContext, DRResourcesContext } from './dr-dashboard-context';
import { StatusCard } from './status-card/status-card';
import { SummaryCard } from './summary-card/summary-card';
import '../mco-common.scss';
import '../../../style.scss';

const getApplicationSetResources = (
  drResources: DisasterRecoveryResourceKind,
  drLoaded: boolean,
  drLoadError: any
) => ({
  drResources: {
    data: drResources,
    loaded: drLoaded,
    loadError: drLoadError,
  },
});

const UpperSection: React.FC = () => (
  <Grid hasGutter>
    <GridItem lg={8} rowSpan={3} sm={12}>
      <StatusCard />
    </GridItem>
    <GridItem lg={4} rowSpan={6} sm={12}>
      <AlertsCard />
    </GridItem>
    <GridItem lg={8} rowSpan={3} sm={12}>
      <SummaryCard />
    </GridItem>
    <GridItem lg={12} rowSpan={6} sm={12}>
      <ClusterAppCard />
    </GridItem>
  </Grid>
);

export const DRDashboard: React.FC = () => {
  const [csvData, csvError, csvLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: STATUS_QUERIES[StorageDashboard.CSV_STATUS_ALL_WHITELISTED],
    basePath: ACM_ENDPOINT,
    cluster: HUB_CLUSTER_NAME,
  });

  const [drResources, drLoaded, drLoadError] =
    useDisasterRecoveryResourceWatch();
  const [argoApplicationSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch(
      getApplicationSetResources(drResources, drLoaded, drLoadError)
    );

  const drClusters: DRClusterKind[] = drResources?.drClusters;
  const managedClusters: ACMManagedClusterKind[] =
    argoApplicationSetResources?.managedClusters;
  const fomratedArgoAppSetResources =
    argoApplicationSetResources?.formattedResources;

  const drClusterAppsMap: DrClusterAppsMap = React.useMemo(() => {
    if (loaded && !loadError) {
      // DRCluster to its ManagedCluster mapping
      const drClusterAppsMap: DrClusterAppsMap = drClusters.reduce(
        (acc, drCluster) => {
          acc[getName(drCluster)] = {
            managedCluster: managedClusters.find(
              (managedCluster) => getName(managedCluster) === getName(drCluster)
            ),
            totalAppSetsCount: 0,
            protectedAppSets: [],
          };
          return acc;
        },
        {} as DrClusterAppsMap
      );

      // DRCluster to its ApplicationSets (total and protected) mapping
      fomratedArgoAppSetResources.forEach((argoApplicationSetResource) => {
        argoApplicationSetResource.placementDecision?.status?.decisions?.forEach(
          (decision) => {
            const decisionCluster = decision?.clusterName;
            if (drClusterAppsMap.hasOwnProperty(decisionCluster)) {
              drClusterAppsMap[decisionCluster].totalAppSetsCount =
                drClusterAppsMap[decisionCluster].totalAppSetsCount + 1;
              if (!!argoApplicationSetResource?.drPlacementControl) {
                drClusterAppsMap[decisionCluster].protectedAppSets.push({
                  application: argoApplicationSetResource.application,
                  /**
                   * FIX THIS
                   * convert "syncInterval" to proper unit and use that at all the places
                   */
                  syncInterval:
                    argoApplicationSetResource.drPolicy?.spec
                      ?.schedulingInterval,
                  drPlacementControl:
                    argoApplicationSetResource.drPlacementControl,
                });
              }
            }
          }
        );
      });
      return drClusterAppsMap;
    }
    return {};
  }, [
    drClusters,
    managedClusters,
    fomratedArgoAppSetResources,
    loaded,
    loadError,
  ]);

  const dRResourcesContext = {
    drClusterAppsMap,
    loaded,
    loadError,
  };

  // ToDo(Sanjal): combime multiple Context together to make it scalable
  // refer: https://javascript.plainenglish.io/how-to-combine-context-providers-for-cleaner-react-code-9ed24f20225e
  return (
    <div className="odf-dashboard-body">
      <CSVStatusesContext.Provider value={{ csvData, csvError, csvLoading }}>
        <DRResourcesContext.Provider value={dRResourcesContext}>
          <UpperSection />
        </DRResourcesContext.Provider>
      </CSVStatusesContext.Provider>
    </div>
  );
};

export default DRDashboard;
