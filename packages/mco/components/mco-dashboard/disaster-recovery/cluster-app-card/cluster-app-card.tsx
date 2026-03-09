import * as React from 'react';
import {
  ALL_APPS,
  applicationDetails,
  DRApplication,
  APPLICATION_TYPE_DISPLAY_TEXT,
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
import { useCustomTranslation } from '@odf/shared';
import { ACMManagedClusterViewModel, MirrorPeerModel } from '@odf/shared';
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
  Content,
  Skeleton,
} from '@patternfly/react-core';
import {
  getProtectedPVCFromVRG,
  filterPVCDataUsingApps,
} from '../../../../utils';
import { getLastSyncPerClusterQuery } from '../../queries';
import {
  OperatorStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import {
  ActivitySection,
  SubscriptionDetailsTable,
  SubscriptionSection,
  SnapshotSection,
  NamespaceSection,
} from './application';
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

const DiscoveredAppCard: React.FC<AppWiseCardProps> = ({
  protectedPVCData,
  selectedApplication,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ProtectedPVCsSection
          protectedPVCData={protectedPVCData}
          selectedApplication={selectedApplication}
        />
      </GridItem>
      <GridItem lg={9} rowSpan={8} sm={12}>
        <NamespaceSection selectedApplication={selectedApplication} />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ActivitySection selectedApplication={selectedApplication} />
      </GridItem>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <SnapshotSection
          selectedApplication={selectedApplication}
          isVolumeSnapshot
        />
      </GridItem>
      <GridItem lg={6} rowSpan={8} sm={12}>
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

const ApplicationSetAppCard: React.FC<AppWiseCardProps> = ({
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
        <SnapshotSection
          selectedApplication={selectedApplication}
          isVolumeSnapshot
        />
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

const SubscriptionSetAppCard: React.FC<AppWiseCardProps> = ({
  protectedPVCData,
  selectedApplication,
}) => {
  return (
    <Grid hasGutter>
      <GridItem lg={3} rowSpan={8} sm={12}>
        <ProtectedPVCsSection
          protectedPVCData={protectedPVCData}
          selectedApplication={selectedApplication}
        />
      </GridItem>
      <GridItem lg={9} rowSpan={8} sm={12}>
        <SubscriptionSection selectedApplication={selectedApplication} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <SubscriptionDetailsTable selectedApplication={selectedApplication} />
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

const ClusterWiseCard: React.FC<ClusterWiseCardProps> = ({
  clusterName,
  lastSyncTimeData,
  protectedPVCData,
  csvData,
  clusterResources,
  podData,
}) => {
  const [mirrorPeers] = useK8sWatchResource<MirrorPeerKind[]>({
    kind: referenceForModel(MirrorPeerModel),
    isList: true,
    namespaced: false,
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
          podData={podData}
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

const AppWiseCard: React.FC<AppWiseCardProps> = (props) => {
  switch (props?.selectedApplication?.appType) {
    case DRApplication.APPSET:
      return <ApplicationSetAppCard {...props} />;
    case DRApplication.SUBSCRIPTION:
      return <SubscriptionSetAppCard {...props} />;
    case DRApplication.DISCOVERED:
      return <DiscoveredAppCard {...props} />;
    default:
      return null;
  }
};

const ClusterAppCardTitle: React.FC<ClusterAppCardTitleProps> = ({
  app,
  appKind,
  appAPIVersion,
  appType,
  cluster,
}) => {
  const { t } = useCustomTranslation();
  const apiVersion = `${appKind?.toLowerCase()}.${
    appAPIVersion?.split('/')[0]
  }`;
  const applicationDetailsPath =
    applicationDetails
      .replace(':namespace', app.namespace)
      .replace(':name', app.name) +
    '?apiVersion=' +
    apiVersion;
  return !!app.namespace ? (
    <div>
      <Content
        component="p"
        className="mco-cluster-app__headerText--size mco-dashboard__statusText--margin"
      >
        {t('Application: ')}
        {appType === DRApplication.DISCOVERED ? (
          app.name
        ) : (
          <Link id="app-search-argo-apps-link" to={applicationDetailsPath}>
            {app.name}
          </Link>
        )}
      </Content>
      <Content component="p" className="mco-dashboard__statusText--margin">
        {t('Type: {{type}}', {
          type: APPLICATION_TYPE_DISPLAY_TEXT(t)[appType],
        })}
      </Content>
    </div>
  ) : (
    <div className="mco-cluster-app__headerText--size">{cluster}</div>
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
  });
  const [lastSyncTimeData, lastSyncTimeError, lastSyncTimeLoading] =
    useCustomPrometheusPoll({
      endpoint: 'api/v1/query' as any,
      query: !!cluster ? getLastSyncPerClusterQuery() : null,
      basePath: usePrometheusBasePath(),
    });

  const {
    csvStatus: { data: csvData, error: csvError, loading: csvLoading },
    podStatus: { data: podData, error: podError, loading: podLoading },
  } = React.useContext(OperatorStatusesContext);

  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  const allLoaded =
    loaded && !csvLoading && !lastSyncTimeLoading && mcvsLoaded && !podLoading;
  const anyError =
    lastSyncTimeError || csvError || loadError || mcvsLoadError || podError;

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

  const loadedWOError = allLoaded && !anyError;
  return (
    <Card data-test="cluster-app-card">
      {loadedWOError && (
        <CardHeader className="mco-cluster-app__text--divider">
          <div className="mco-dashboard__contentColumn">
            <ClusterAppDropdown
              clusterResources={drClusterAppsMap}
              clusterName={cluster}
              application={application}
              setCluster={setCluster}
              setApplication={setApplication}
            />
            <CardTitle className="mco-cluster-app__text--margin-top">
              <ClusterAppCardTitle
                app={application}
                cluster={cluster}
                appKind={selectedApplication?.appKind}
                appType={selectedApplication?.appType}
                appAPIVersion={selectedApplication?.appAPIVersion}
              />
            </CardTitle>
          </div>
        </CardHeader>
      )}
      <CardBody>
        {loadedWOError &&
          (!application.namespace && application.name === ALL_APPS ? (
            <ClusterWiseCard
              clusterName={cluster}
              lastSyncTimeData={lastSyncTimeData}
              protectedPVCData={protectedPVCData}
              csvData={csvData}
              podData={podData}
              clusterResources={drClusterAppsMap}
            />
          ) : (
            <AppWiseCard
              protectedPVCData={protectedPVCData}
              selectedApplication={selectedApplication}
            />
          ))}
        {!allLoaded && !anyError && (
          <div style={{ height: '200px' }}>
            <Skeleton height="100%" />
          </div>
        )}
        {anyError && (
          <div className="mco-dashboard__centerComponent">
            <DataUnavailableError />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

type ClusterWiseCardProps = {
  clusterName: string;
  lastSyncTimeData: PrometheusResponse;
  protectedPVCData: ProtectedPVCData[];
  csvData: PrometheusResponse;
  podData: PrometheusResponse;
  clusterResources: DRClusterAppsMap;
};

type AppWiseCardProps = {
  protectedPVCData: ProtectedPVCData[];
  selectedApplication: ProtectedAppsMap;
};

type ClusterAppCardTitleProps = {
  app: ApplicationObj;
  cluster: string;
  appKind: string;
  appAPIVersion: string;
  appType: DRApplication;
};
