import * as React from 'react';
import { ACM_ENDPOINT, HUB_CLUSTER_NAME, ALL_APPS } from '@odf/mco/constants';
import {
  DrClusterAppsMap,
  AppSetObj,
  ProtectedAppSetsMap,
} from '@odf/mco/types';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { getName, getNamespace } from '@odf/shared/selectors';
import { PrometheusResponse } from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { getPvcSlaPerClusterQuery } from '../../queries';
import {
  CSVStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import {
  ProtectedPVCsSection,
  RPOSection,
  ActivitySection,
  SnapshotSection,
  ReplicationHistorySection,
} from './argo-application-set';
import {
  HealthSection,
  PeerConnectionSection,
  ApplicationsSection,
  PVCsSection,
} from './cluster';
import { ClusterAppDropdown, VolumeSummarySection } from './common';
import './cluster-app-card.scss';

export const ClusterWiseCard: React.FC<ClusterWiseCardProps> = ({
  clusterName,
  pvcSLAData,
  csvData,
  clusterResources,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={6} rowSpan={4} sm={12}>
        <HealthSection
          clusterResources={clusterResources}
          csvData={csvData}
          clusterName={clusterName}
        />
      </GridItem>
      <GridItem lg={6} rowSpan={4} sm={12}>
        <PeerConnectionSection clusterName={clusterName} />
      </GridItem>
      <GridItem lg={6} rowSpan={4} sm={12}>
        <ApplicationsSection
          clusterResources={clusterResources}
          clusterName={clusterName}
          pvcSLAData={pvcSLAData}
        />
      </GridItem>
      <GridItem lg={6} rowSpan={4} sm={12}>
        <PVCsSection
          clusterResources={clusterResources}
          clusterName={clusterName}
        />
      </GridItem>
      <GridItem rowSpan={4} sm={12}>
        <VolumeSummarySection pvcSLAData={pvcSLAData} />
      </GridItem>
    </Grid>
  );
};

export const AppWiseCard: React.FC<AppWiseCardProps> = ({
  clusterName,
  pvcSLAData,
  selectedAppSet,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={6} rowSpan={2} sm={12}>
        <ProtectedPVCsSection
          clusterName={clusterName}
          pvcSLAData={pvcSLAData}
          selectedAppSet={selectedAppSet}
        />
      </GridItem>
      <GridItem lg={6} rowSpan={2} sm={12}>
        <RPOSection selectedAppSet={selectedAppSet} />
      </GridItem>
      <GridItem lg={6} rowSpan={2} sm={12}>
        <ActivitySection selectedAppSet={selectedAppSet} />
      </GridItem>
      <GridItem lg={6} rowSpan={2} sm={12}>
        <SnapshotSection selectedAppSet={selectedAppSet} />
      </GridItem>
      <GridItem lg={12} rowSpan={3} sm={12}>
        <VolumeSummarySection
          pvcSLAData={pvcSLAData}
          selectedAppSet={selectedAppSet}
        />
      </GridItem>
      <GridItem lg={12} rowSpan={5} sm={12}>
        <ReplicationHistorySection
          clusterName={clusterName}
          selectedAppSet={selectedAppSet}
          pvcSLAData={pvcSLAData}
        />
      </GridItem>
    </Grid>
  );
};

export const ClusterAppCard: React.FC = () => {
  const [cluster, setCluster] = React.useState<string>();
  const [appSet, setAppSet] = React.useState<AppSetObj>({
    namespace: undefined,
    name: ALL_APPS,
  });
  const [pvcSLAData, pvcSLAError, pvcSLALoading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/query' as any,
    query: !!cluster ? getPvcSlaPerClusterQuery(cluster) : null,
    basePath: ACM_ENDPOINT,
    cluster: HUB_CLUSTER_NAME,
  });

  const { csvData, csvError, csvLoading } =
    React.useContext(CSVStatusesContext);
  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  const allLoaded = loaded && !csvLoading && !pvcSLALoading;
  const anyError = pvcSLAError || csvError || loadError;

  const selectedAppSet: ProtectedAppSetsMap = React.useMemo(() => {
    const { name, namespace } = appSet || {};
    return !!namespace && name !== ALL_APPS
      ? drClusterAppsMap[cluster]?.protectedAppSets?.find(
          (protectedAppSet) =>
            getName(protectedAppSet?.application) === name &&
            getNamespace(protectedAppSet?.application) === namespace
        )
      : undefined;
  }, [appSet, drClusterAppsMap, cluster]);

  return (
    <Card data-test="cluster-app-card">
      {allLoaded && !anyError && (
        <>
          <CardHeader>
            <div className="mco-dashboard__contentColumn">
              <ClusterAppDropdown
                clusterResources={drClusterAppsMap}
                clusterName={cluster}
                appSet={appSet}
                setCluster={setCluster}
                setAppSet={setAppSet}
              />
              <CardTitle className="mco-cluster-app__text--margin-top">
                {cluster}
              </CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {!appSet.namespace && appSet.name === ALL_APPS ? (
              <ClusterWiseCard
                clusterName={cluster}
                pvcSLAData={pvcSLAData}
                csvData={csvData}
                clusterResources={drClusterAppsMap}
              />
            ) : (
              <AppWiseCard
                clusterName={cluster}
                pvcSLAData={pvcSLAData}
                selectedAppSet={selectedAppSet}
              />
            )}
          </CardBody>
        </>
      )}
      {!allLoaded && !anyError && (
        <div className="mco-dashboard-loading__singleBlock" />
      )}
      {anyError && (
        <div className="mco-dashboard__centerComponent">
          <DataUnavailableError />
        </div>
      )}
    </Card>
  );
};

type ClusterWiseCardProps = {
  clusterName: string;
  pvcSLAData: PrometheusResponse;
  csvData: PrometheusResponse;
  clusterResources: DrClusterAppsMap;
};

type AppWiseCardProps = {
  clusterName: string;
  pvcSLAData: PrometheusResponse;
  selectedAppSet: ProtectedAppSetsMap;
};
