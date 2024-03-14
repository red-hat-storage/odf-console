import * as React from 'react';
import { ACMManagedClusterKind, DRClusterAppsMap } from '@odf/mco/types';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import { Grid, GridItem } from '@patternfly/react-core';
import {
  ACM_ENDPOINT,
  HUB_CLUSTER_NAME,
  ACM_OBSERVABILITY_FLAG,
} from '../../../constants';
import {
  getManagedClusterResourceObj,
  useDisasterRecoveryResourceWatch,
} from '../../../hooks';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import { AlertsCard } from './alert-card/alert-card';
import { ClusterAppCard } from './cluster-app-card/cluster-app-card';
import { CSVStatusesContext, DRResourcesContext } from './dr-dashboard-context';
import { GettingStartedCard } from './getting-started-card';
import { useApplicationSetParser } from './parsers/applicationset-parser';
import { useSubscriptionParser } from './parsers/subscription-parser';
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

const aggregateAppsMap = (
  clusterAppsList: DRClusterAppsMap[]
): DRClusterAppsMap =>
  clusterAppsList.reduce((acc, clusterAppsMap) => {
    Object.keys(clusterAppsMap).forEach((clusterName) => {
      const { managedCluster, totalAppCount, protectedApps } =
        clusterAppsMap[clusterName];

      if (!acc.hasOwnProperty(clusterName)) {
        acc[clusterName] = {
          managedCluster: managedCluster,
          totalAppCount: totalAppCount,
          protectedApps: protectedApps,
        };
      } else {
        acc[clusterName].totalAppCount += totalAppCount;
        acc[clusterName].protectedApps =
          acc[clusterName].protectedApps.concat(protectedApps);
      }
    });
    return acc;
  }, {});

const MonitoringDashboard: React.FC = () => {
  const [csvData, csvError, csvLoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: STATUS_QUERIES[StorageDashboard.CSV_STATUS_ALL_WHITELISTED],
    basePath: ACM_ENDPOINT,
    cluster: HUB_CLUSTER_NAME,
  });

  const [drResources, drLoaded, drLoadError] =
    useDisasterRecoveryResourceWatch();

  const [managedClusters, managedClusterLoaded, managedClusterLoadError] =
    useK8sWatchResource<ACMManagedClusterKind[]>(
      getManagedClusterResourceObj()
    );

  const [subscriptions, subscriptionLoaded, subscriptionLoadError] =
    useSubscriptionParser(
      drResources,
      drLoaded,
      drLoadError,
      managedClusters,
      managedClusterLoaded,
      managedClusterLoadError
    );

  const [applicationSets, applicationSetLoaded, applicationSetLoadError] =
    useApplicationSetParser(
      drResources,
      drLoaded,
      drLoadError,
      managedClusters,
      managedClusterLoaded,
      managedClusterLoadError
    );

  const loaded = applicationSetLoaded && subscriptionLoaded;
  const loadError = applicationSetLoadError || subscriptionLoadError;

  const aggregatedAppsMap = React.useMemo(() => {
    if (!!loaded && !loadError) {
      return aggregateAppsMap([subscriptions, applicationSets]);
    }
    return {};
  }, [applicationSets, subscriptions, loaded, loadError]);

  const dRResourcesContext = {
    drClusterAppsMap: aggregatedAppsMap,
    loaded,
    loadError,
  };

  // ToDo(Sanjal): combime multiple Context together to make it scalable
  // refer: https://javascript.plainenglish.io/how-to-combine-context-providers-for-cleaner-react-code-9ed24f20225e
  return (
    <CSVStatusesContext.Provider value={{ csvData, csvError, csvLoading }}>
      <DRResourcesContext.Provider value={dRResourcesContext}>
        <UpperSection />
      </DRResourcesContext.Provider>
    </CSVStatusesContext.Provider>
  );
};

const DRDashboard: React.FC = () => {
  const isMonitoringEnabled = useFlag(ACM_OBSERVABILITY_FLAG);

  return (
    <div className="odf-dashboard-body">
      <GettingStartedCard />
      {isMonitoringEnabled && <MonitoringDashboard />}
    </div>
  );
};

export default DRDashboard;
