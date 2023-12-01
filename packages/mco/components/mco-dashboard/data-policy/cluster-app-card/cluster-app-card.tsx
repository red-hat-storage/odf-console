import * as React from 'react';
import {
  HUB_CLUSTER_NAME,
  ALL_APPS,
  applicationDetails,
} from '@odf/mco/constants';
import {
  DRClusterAppsMap,
  ApplicationObj,
  ProtectedAppsMap,
  ACMManagedClusterViewKind,
  ProtectedPVCData,
  MirrorPeerKind,
} from '@odf/mco/types';
import { getClusterNamesFromMirrorPeers } from '@odf/mco/utils';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { referenceForModel } from '@odf/shared/utils';
import {
  PrometheusResponse,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Link } from 'react-router-dom-v5-compat';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import {
  ACMManagedClusterViewModel,
  MirrorPeerModel,
} from '../../../../models';
import {
  getProtectedPVCFromVRG,
  filterPVCDataUsingApps,
} from '../../../../utils';
import { getLastSyncPerClusterQuery } from '../../queries';
import {
  CSVStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import { ActivitySection, SnapshotSection } from './application';
import {
  HealthSection,
  PeerConnectionSection,
  ApplicationsSection,
  UtilizationCard,
} from './cluster';
import {
  ClusterAppDropdown,
  ProtectedPVCsSection,
  VolumeSummarySection,
} from './common';
import './cluster-app-card.scss';

export const ClusterWiseCard: React.FC<ClusterWiseCardProps> = ({
  clusterName,
  lastSyncTimeData,
  protectedPVCData,
  csvData,
  clusterResources,
}) => {
  const [mirrorPeers] = useK8sWatchResource<MirrorPeerKind[]>({
    kind: referenceForModel(MirrorPeerModel),
    isList: true,
    namespaced: false,
    cluster: HUB_CLUSTER_NAME,
  });
  const peerClusters = getClusterNamesFromMirrorPeers(
    mirrorPeers || [],
    clusterName
  );
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
        <PeerConnectionSection peerClusters={peerClusters} />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ApplicationsSection
          clusterResources={clusterResources}
          clusterName={clusterName}
          lastSyncTimeData={lastSyncTimeData}
        />
      </GridItem>
      <GridItem lg={9} rowSpan={10} sm={12}>
        <ProtectedPVCsSection protectedPVCData={protectedPVCData} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <VolumeSummarySection protectedPVCData={protectedPVCData} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <UtilizationCard
          clusterName={clusterName}
          peerClusters={peerClusters}
        />
      </GridItem>
    </Grid>
  );
};

export const AppWiseCard: React.FC<AppWiseCardProps> = ({
  protectedPVCData,
  selectedApplication,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <ProtectedPVCsSection
          protectedPVCData={protectedPVCData}
          selectedApplication={selectedApplication}
        />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ActivitySection selectedApplication={selectedApplication} />
      </GridItem>
      <GridItem lg={9} rowSpan={8} sm={12}>
        <SnapshotSection selectedApplication={selectedApplication} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <VolumeSummarySection
          protectedPVCData={protectedPVCData}
          selectedApplication={selectedApplication}
        />
      </GridItem>
    </Grid>
  );
};

export const ClusterAppCard: React.FC = () => {
  const [cluster, setCluster] = React.useState<string>();
  const [application, setApplication] = React.useState<ApplicationObj>({
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
      basePath: usePrometheusBasePath(),
    });

  const { csvData, csvError, csvLoading } =
    React.useContext(CSVStatusesContext);
  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  const allLoaded = loaded && !csvLoading && !lastSyncTimeLoading && mcvsLoaded;
  const anyError = lastSyncTimeError || csvError || loadError || mcvsLoadError;

  const selectedApplication: ProtectedAppsMap = React.useMemo(() => {
    const { name, namespace } = application || {};
    return !!namespace && name !== ALL_APPS
      ? drClusterAppsMap[cluster]?.protectedApps?.find(
          (protectedApp) =>
            protectedApp?.appName === name &&
            protectedApp?.appNamespace === namespace
        )
      : undefined;
  }, [application, drClusterAppsMap, cluster]);

  const protectedPVCData: ProtectedPVCData[] = React.useMemo(() => {
    const pvcsData =
      (mcvsLoaded && !mcvsLoadError && getProtectedPVCFromVRG(mcvs)) || [];
    const protectedApps = !!selectedApplication
      ? [selectedApplication]
      : drClusterAppsMap[cluster]?.protectedApps;
    return filterPVCDataUsingApps(pvcsData, protectedApps);
  }, [
    drClusterAppsMap,
    selectedApplication,
    cluster,
    mcvs,
    mcvsLoaded,
    mcvsLoadError,
  ]);
  const apiVersion = `${selectedApplication?.appKind?.toLowerCase()}.${
    selectedApplication?.appAPIVersion?.split('/')[0]
  }`;
  const applicationDetailsPath =
    applicationDetails
      .replace(':namespace', application.namespace)
      .replace(':name', application.name) +
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
                application={application}
                setCluster={setCluster}
                setApplication={setApplication}
              />
              <CardTitle className="mco-cluster-app__text--margin-top mco-cluster-app__headerText--size">
                {!!application.namespace ? (
                  <Link id="app-overview-link" to={applicationDetailsPath}>
                    {application.name}
                  </Link>
                ) : (
                  cluster
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            {!application.namespace && application.name === ALL_APPS ? (
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
                selectedApplication={selectedApplication}
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
  clusterResources: DRClusterAppsMap;
};

type AppWiseCardProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedApplication: ProtectedAppsMap;
};
