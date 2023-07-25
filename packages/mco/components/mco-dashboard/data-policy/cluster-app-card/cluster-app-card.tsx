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
  MirrorPeerKind,
} from '@odf/mco/types';
import { getClusterNamesFromMirrorPeers } from '@odf/mco/utils';
import { getMax, getMin } from '@odf/shared/charts';
import { CustomUtilizationSummaryProps } from '@odf/shared/dashboards/utilization-card/utilization-item';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { useCustomPrometheusPoll } from '@odf/shared/hooks/custom-prometheus-poll';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  humanizeBinaryBytes,
  humanizeDecimalBytesPerSec,
  humanizeNumber,
  referenceForModel,
} from '@odf/shared/utils';
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
import {
  ACMManagedClusterViewModel,
  MirrorPeerModel,
} from '../../../../models';
import {
  getProtectedPVCFromVRG,
  filterPVCDataUsingAppsets,
} from '../../../../utils';
import { DRDashboard, getLastSyncPerClusterQuery } from '../../queries';
import {
  CSVStatusesContext,
  DRResourcesContext,
} from '../dr-dashboard-context';
import {
  ProtectedPVCsSection,
  ActivitySection,
  SnapshotSection,
} from './argo-application-set';
import {
  HealthSection,
  PeerConnectionSection,
  ApplicationsSection,
  PVCsSection,
  SnapshotUtilizationCard,
} from './cluster';
import { ClusterAppDropdown, VolumeSummarySection } from './common';
import './cluster-app-card.scss';

const CustomUtilizationSummary: React.FC<CustomUtilizationSummaryProps> = ({
  currentHumanized,
  utilizationData,
}) => {
  const { t } = useCustomTranslation();
  const maxVal = getMax(utilizationData);
  const minVal = getMin(utilizationData);
  const humanizedMax = !!maxVal ? humanizeBinaryBytes(maxVal).string : null;
  const humanizedMin = !!minVal ? humanizeBinaryBytes(minVal).string : null;

  return (
    <div className="co-utilization-card__item-value co-utilization-card__item-summary">
      <div>
        <span>{t('Current value: ')}</span>
        <span className="bold">{currentHumanized}</span>
      </div>
      {!!utilizationData?.length && (
        <>
          <div>
            <span>{t('Max value: ')}</span>
            <span className="bold">{humanizedMax}</span>
          </div>
          <div>
            <span>{t('Min value: ')}</span>
            <span className="bold">{humanizedMin}</span>
          </div>
        </>
      )}
    </div>
  );
};

export const ClusterWiseCard: React.FC<ClusterWiseCardProps> = ({
  clusterName,
  lastSyncTimeData,
  protectedPVCData,
  csvData,
  clusterResources,
}) => {
  const { t } = useCustomTranslation();
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
        <PVCsSection
          protectedPVCData={protectedPVCData}
          clusterName={clusterName}
        />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <VolumeSummarySection protectedPVCData={protectedPVCData} />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <SnapshotUtilizationCard
          clusters={peerClusters}
          title={t('Snapshots synced')}
          queryType={DRDashboard.RBD_SNAPSHOT_SNAPSHOTS}
          titleToolTip={t(
            'The y-axis shows the number of snapshots taken. It represents the rate of difference in snapshot creation count during a failover.'
          )}
          humanizeValue={humanizeNumber}
        />
      </GridItem>
      <GridItem lg={12} rowSpan={8} sm={12}>
        <SnapshotUtilizationCard
          clusters={[clusterName]}
          title={t('Replication throughput')}
          queryType={DRDashboard.RBD_SNAPSHOTS_SYNC_BYTES}
          titleToolTip={t(
            'The y-axis shows the average throughput for syncing snapshot bytes from the primary to the secondary cluster.'
          )}
          humanizeValue={humanizeDecimalBytesPerSec}
          CustomUtilizationSummary={CustomUtilizationSummary}
        />
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
