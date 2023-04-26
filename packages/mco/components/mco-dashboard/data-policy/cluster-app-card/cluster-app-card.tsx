import * as React from 'react';
import {
  ACM_ENDPOINT,
  HUB_CLUSTER_NAME,
  ALL_APPS,
  applicationDetails,
} from '@odf/mco/constants';
import {
  DrClusterAppsMap,
  AppSetObj,
  ProtectedAppSetsMap,
  ACMManagedClusterViewKind,
  ProtectedPVCData,
} from '@odf/mco/types';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { referenceForModel } from '@odf/shared/utils';
import {
  PrometheusResponse,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import { ACMManagedClusterViewModel } from '../../../../models';
import {
  getProtectedPVCFromVRG,
  filterPVCDataUsingAppsets,
} from '../../../../utils';
import { getLastSyncPerClusterQuery } from '../../queries';
import {
  CSVStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import {
  ProtectedPVCsSection,
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
  lastSyncTimeData,
  protectedPVCData,
  csvData,
  clusterResources,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <HealthSection
          clusterResources={clusterResources}
          csvData={csvData}
          clusterName={clusterName}
        />
      </GridItem>
      <GridItem lg={9} rowSpan={8} sm={12}>
        <PeerConnectionSection clusterName={clusterName} />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ApplicationsSection
          clusterResources={clusterResources}
          clusterName={clusterName}
          lastSyncTimeData={lastSyncTimeData}
        />
      </GridItem>
      <GridItem lg={9} rowSpan={10} sm={12}>
        <PVCsSection
          protectedPVCData={protectedPVCData}
          clusterName={clusterName}
        />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <VolumeSummarySection protectedPVCData={protectedPVCData} />
      </GridItem>
    </Grid>
  );
};

export const AppWiseCard: React.FC<AppWiseCardProps> = ({
  protectedPVCData,
  selectedAppSet,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <ProtectedPVCsSection
          protectedPVCData={protectedPVCData}
          selectedAppSet={selectedAppSet}
        />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ActivitySection selectedAppSet={selectedAppSet} />
      </GridItem>
      <GridItem lg={9} rowSpan={8} sm={12}>
        <SnapshotSection selectedAppSet={selectedAppSet} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <VolumeSummarySection
          protectedPVCData={protectedPVCData}
          selectedAppSet={selectedAppSet}
        />
      </GridItem>
      <GridItem lg={12} rowSpan={3} sm={12}>
        <ReplicationHistorySection selectedAppSet={selectedAppSet} />
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
  const [mcvs, mcvsLoaded, mcvsLoadError] = useK8sWatchResource<
    ACMManagedClusterViewKind[]
  >({
    kind: referenceForModel(ACMManagedClusterViewModel),
    isList: true,
    namespace: cluster,
    namespaced: true,
    optional: true,
    cluster: HUB_CLUSTER_NAME,
  });
  const [lastSyncTimeData, lastSyncTimeError, lastSyncTimeLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: !!cluster ? getLastSyncPerClusterQuery() : null,
      basePath: ACM_ENDPOINT,
      cluster: HUB_CLUSTER_NAME,
    });

  const { csvData, csvError, csvLoading } =
    React.useContext(CSVStatusesContext);
  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  const allLoaded = loaded && !csvLoading && !lastSyncTimeLoading && mcvsLoaded;
  const anyError = lastSyncTimeError || csvError || loadError || mcvsLoadError;

  const selectedAppSet: ProtectedAppSetsMap = React.useMemo(() => {
    const { name, namespace } = appSet || {};
    return !!namespace && name !== ALL_APPS
      ? drClusterAppsMap[cluster]?.protectedAppSets?.find(
          (protectedAppSet) =>
            protectedAppSet?.appName === name &&
            protectedAppSet?.appNamespace === namespace
        )
      : undefined;
  }, [appSet, drClusterAppsMap, cluster]);

  const protectedPVCData: ProtectedPVCData[] = React.useMemo(() => {
    const pvcsData =
      (mcvsLoaded && !mcvsLoadError && getProtectedPVCFromVRG(mcvs)) || [];
    const protectedAppSets = !!selectedAppSet
      ? [selectedAppSet]
      : drClusterAppsMap[cluster]?.protectedAppSets;
    return filterPVCDataUsingAppsets(pvcsData, protectedAppSets);
  }, [
    drClusterAppsMap,
    selectedAppSet,
    cluster,
    mcvs,
    mcvsLoaded,
    mcvsLoadError,
  ]);
  const apiVersion = `${selectedAppSet?.appKind?.toLowerCase()}.${
    selectedAppSet?.appAPIVersion?.split('/')[0]
  }`;
  const applicationDetailsPath =
    applicationDetails
      .replace(':namespace', appSet.namespace)
      .replace(':name', appSet.name) +
    '?apiVersion=' +
    apiVersion;

  return (
    <Card data-test="cluster-app-card">
      {allLoaded && !anyError && (
        <>
          <CardHeader className="mco-cluster-app__text--divider">
            <div className="mco-dashboard__contentColumn">
              <ClusterAppDropdown
                clusterResources={drClusterAppsMap}
                clusterName={cluster}
                appSet={appSet}
                setCluster={setCluster}
                setAppSet={setAppSet}
              />
              <CardTitle className="mco-cluster-app__text--margin-top mco-cluster-app__headerText--size">
                {!!appSet.namespace ? (
                  <Link
                    id="app-search-argo-apps-link"
                    to={applicationDetailsPath}
                  >
                    {appSet.name}
                  </Link>
                ) : (
                  cluster
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {!appSet.namespace && appSet.name === ALL_APPS ? (
              <ClusterWiseCard
                clusterName={cluster}
                lastSyncTimeData={lastSyncTimeData}
                protectedPVCData={protectedPVCData}
                csvData={csvData}
                clusterResources={drClusterAppsMap}
              />
            ) : (
              <AppWiseCard
                protectedPVCData={protectedPVCData}
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
  lastSyncTimeData: PrometheusResponse;
  protectedPVCData: ProtectedPVCData[];
  csvData: PrometheusResponse;
  clusterResources: DrClusterAppsMap;
};

type AppWiseCardProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedAppSet: ProtectedAppSetsMap;
};
