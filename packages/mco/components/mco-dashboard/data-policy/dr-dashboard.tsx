import * as React from 'react';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { getName, getNamespace } from '@odf/shared/selectors';
import {
  useK8sWatchResource,
  useK8sWatchResources,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { Grid, GridItem } from '@patternfly/react-core';
import {
  ACM_ENDPOINT,
  APPLICATION_TYPE,
  DRPC_STATUS,
  HUB_CLUSTER_NAME,
} from '../../../constants';
import {
  useDRResourceParser,
  useArgoAppSetResourceParser,
  getManagedClusterResourceObj,
  getDRResources,
  getArgoAppSetResources,
} from '../../../hooks';
import {
  ACMManagedClusterKind,
  DrClusterAppsMap,
  WatchDRResourceType,
  WatchArgoAppSetResourceType,
  ArgoApplicationSetKind,
} from '../../../types';
import {
  findDRType,
  getProtectedPVCsFromDRPC,
  getRemoteNSFromAppSet,
} from '../../../utils';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import { AlertsCard } from './alert-card/alert-card';
import { ClusterAppCard } from './cluster-app-card/cluster-app-card';
import { CSVStatusesContext, DRResourcesContext } from './dr-dashboard-context';
import { StatusCard } from './status-card/status-card';
import { SummaryCard } from './summary-card/summary-card';
import '../mco-dashboard.scss';
import '../../../style.scss';

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
  const drResources = useK8sWatchResources<WatchDRResourceType>(
    getDRResources()
  );
  const appResources = useK8sWatchResources<WatchArgoAppSetResourceType>(
    getArgoAppSetResources()
  );
  const [managedClusters, managedClusterLoaded, ManagedClusterLoadError] =
    useK8sWatchResource<ACMManagedClusterKind[]>(
      getManagedClusterResourceObj()
    );
  const drParserResult = useDRResourceParser({ resources: drResources });
  const appParserResult = useArgoAppSetResourceParser({
    resources: { ...appResources, drResources: drParserResult },
  });
  const {
    data: aroAppSetResources,
    loaded: resourceLoaded,
    loadError: resourceLoadedError,
  } = appParserResult;
  const loaded = resourceLoaded && managedClusterLoaded;
  const loadError = resourceLoadedError || ManagedClusterLoadError;
  const { data: drClusters } = drResources?.drClusters || {};

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
      aroAppSetResources.forEach((argoApplicationSetResource) => {
        const { applicationInfo } = argoApplicationSetResource || {};
        const { application } = applicationInfo || {};
        const { drInfo, placementInfo } =
          applicationInfo?.deploymentInfo?.[0] || {};
        const { placementDecision } = placementInfo || {};
        const {
          drClusters: currentDrClusters,
          drPlacementControl,
          drPolicy,
        } = drInfo || {};
        placementDecision?.status?.decisions?.forEach((decision) => {
          const decisionCluster = decision?.clusterName;
          if (drClusterAppsMap.hasOwnProperty(decisionCluster)) {
            drClusterAppsMap[decisionCluster].totalAppSetsCount =
              drClusterAppsMap[decisionCluster].totalAppSetsCount + 1;
            if (!_.isEmpty(drPlacementControl)) {
              drClusterAppsMap[decisionCluster].protectedAppSets.push({
                appName: getName(application),
                appNamespace: getNamespace(application),
                appKind: application?.kind,
                appAPIVersion: application?.apiVersion,
                appType: APPLICATION_TYPE.APPSET,
                placementInfo: [
                  {
                    deploymentClusterName: decisionCluster,
                    drpcName: getName(drPlacementControl),
                    drpcNamespace: getNamespace(drPlacementControl),
                    protectedPVCs: getProtectedPVCsFromDRPC(drPlacementControl),
                    replicationType: findDRType(currentDrClusters),
                    syncInterval: drPolicy?.spec?.schedulingInterval,
                    workloadNamespace: getRemoteNSFromAppSet(
                      application as ArgoApplicationSetKind
                    ),
                    failoverCluster: drPlacementControl?.spec?.failoverCluster,
                    preferredCluster:
                      drPlacementControl?.spec?.preferredCluster,
                    lastGroupSyncTime:
                      drPlacementControl?.status?.lastGroupSyncTime,
                    status: drPlacementControl?.status?.phase as DRPC_STATUS,
                  },
                ],
              });
            }
          }
        });
      });
      return drClusterAppsMap;
    }
    return {};
  }, [drClusters, managedClusters, aroAppSetResources, loaded, loadError]);

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
