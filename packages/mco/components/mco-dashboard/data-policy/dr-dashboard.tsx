import * as React from 'react';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { Grid, GridItem } from '@patternfly/react-core';
import { ACM_ENDPOINT, HUB_CLUSTER_NAME } from '../../../constants';
import { useArgoApplicationSetResourceWatch } from '../../../hooks';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import { AlertsCard } from './alert-card/alert-card';
import { ClustersCard } from './cluster-app-card/cluster-card';
import { CSVStatusesContext, DRResourcesContext } from './dr-dashboard-context';
import { StatusCard } from './status-card/status-card';
import { SummaryCard } from './summary-card/summary-card';
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
      <ClustersCard />
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
  const [argoApplicationSetResources, loaded, loadError] =
    useArgoApplicationSetResourceWatch();

  // ToDo(Sanjal): combime multiple Context together to make it scalable
  // refer: https://javascript.plainenglish.io/how-to-combine-context-providers-for-cleaner-react-code-9ed24f20225e
  return (
    <div className="odf-dashboard-body">
      <CSVStatusesContext.Provider value={{ csvData, csvError, csvLoading }}>
        <DRResourcesContext.Provider
          value={{ argoApplicationSetResources, loaded, loadError }}
        >
          <UpperSection />
        </DRResourcesContext.Provider>
      </CSVStatusesContext.Provider>
    </div>
  );
};

export default DRDashboard;
