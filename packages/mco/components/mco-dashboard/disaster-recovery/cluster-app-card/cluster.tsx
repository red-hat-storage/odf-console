/**
 * Add components specific to cluster-wise card
 */

import * as React from 'react';
import {
  DRDashboard,
  getRBDSnapshotUtilizationQuery,
} from '@odf/mco/components/mco-dashboard/queries';
import {
  ODR_CLUSTER_OPERATOR,
  VOL_SYNC,
  ACM_ENDPOINT,
  VolumeReplicationHealth,
  OBJECT_NAMESPACE,
  OBJECT_NAME,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
  DRApplication,
  LEAST_SECONDS_IN_PROMETHEUS,
  ReplicationType,
} from '@odf/mco/constants';
import { DRClusterAppsMap, ProtectedAppsMap } from '@odf/mco/types';
import {
  getVolumeReplicationHealth,
  ValidateManagedClusterCondition,
} from '@odf/mco/utils';
import {
  GreenCheckCircleIcon,
  YellowExclamationTriangleIcon,
} from '@odf/shared';
import { getMax, getMin } from '@odf/shared/charts';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { CustomUtilizationSummaryProps } from '@odf/shared/dashboards/utilization-card/utilization-item';
import { getTimeDifferenceInSeconds } from '@odf/shared/details-page/datetime';
import { FieldLevelHelp } from '@odf/shared/generic';
import Status, { StatusPopupSection } from '@odf/shared/popup/status-popup';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { humanizeDecimalBytesPerSec, humanizeNumber } from '@odf/shared/utils';
import {
  HealthState,
  PrometheusResponse,
  PrometheusResult,
  StatusIconAndText,
  Humanize,
} from '@openshift-console/dynamic-plugin-sdk';
import { UtilizationDurationDropdown } from '@openshift-console/dynamic-plugin-sdk-internal';
import {
  Flex,
  Grid,
  GridItem,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ConnectedIcon } from '@patternfly/react-icons';
import { StatusText } from './common';
import './cluster-app-card.scss';

const checkVolumeReplicationHealth = (
  protectedAppMap: ProtectedAppsMap,
  lastSyncTimeData: PrometheusResponse
): boolean =>
  !!protectedAppMap.placementControlInfo?.find(
    (placementInfo) =>
      !!lastSyncTimeData?.data?.result?.find(
        (item: PrometheusResult) =>
          item.metric?.[OBJECT_NAMESPACE] === placementInfo.drpcNamespace &&
          item.metric?.[OBJECT_NAME] === placementInfo.drpcName &&
          getVolumeReplicationHealth(
            Number(item.value[1]) || 0,
            placementInfo.volumeSyncInterval
          )[0] !== VolumeReplicationHealth.HEALTHY
      )
  );

const checkKubeObjBackupHealth = (
  protectedAppMap: ProtectedAppsMap
): boolean => {
  const { kubeObjectLastProtectionTime, replicationType } =
    protectedAppMap.placementControlInfo[0];
  const objCaptureInterval =
    protectedAppMap.placementControlInfo[0].kubeObjSyncInterval;
  return protectedAppMap.appType === DRApplication.DISCOVERED &&
    replicationType === ReplicationType.ASYNC
    ? getVolumeReplicationHealth(
        !!kubeObjectLastProtectionTime
          ? getTimeDifferenceInSeconds(kubeObjectLastProtectionTime)
          : LEAST_SECONDS_IN_PROMETHEUS,
        objCaptureInterval
      )[0] !== VolumeReplicationHealth.HEALTHY
    : false;
};

const OperatorsHealthPopUp: React.FC<OperatorsHealthPopUpProps> = ({
  clusterOperatorStatus,
}) => {
  const { t } = useCustomTranslation();

  return (
    <Flex direction={{ default: 'column' }}>
      <StatusText>{t('Operator health')}</StatusText>
      <Flex data-test="operator-health-description">
        {t(
          'Operators are responsible for maintaining and reconciling the state of the cluster.'
        )}
      </Flex>
      <Flex>
        <StatusPopupSection firstColumn="Operators" secondColumn="Status">
          <Status
            icon={
              healthStateMapping[
                clusterOperatorStatus?.[ODR_CLUSTER_OPERATOR] !== '1'
                  ? HealthState.ERROR
                  : HealthState.OK
              ].icon
            }
            value={
              clusterOperatorStatus?.[ODR_CLUSTER_OPERATOR] !== '1'
                ? t('Degraded')
                : t('Healthy')
            }
          >
            {t('DR Cluster operator')}
          </Status>
          <Status
            icon={
              healthStateMapping[
                clusterOperatorStatus?.[VOL_SYNC] !== '1'
                  ? HealthState.ERROR
                  : HealthState.OK
              ].icon
            }
            value={
              clusterOperatorStatus?.[VOL_SYNC] !== '1'
                ? t('Degraded')
                : t('Healthy')
            }
          >
            {t('VolSync')}
          </Status>
        </StatusPopupSection>
      </Flex>
    </Flex>
  );
};

export const HealthSection: React.FC<HealthSectionProps> = ({
  clusterResources,
  csvData,
  clusterName,
  podData,
}) => {
  const { t } = useCustomTranslation();

  const clusterOperatorStatus = React.useMemo(() => {
    const operatorStatus = {};
    csvData?.data?.result?.forEach((item: PrometheusResult) => {
      if (item?.metric.cluster === clusterName) {
        item?.metric.name.startsWith(ODR_CLUSTER_OPERATOR) &&
          (operatorStatus[ODR_CLUSTER_OPERATOR] = item?.value[1]);
      }
    });
    podData?.data?.result?.forEach((item: PrometheusResult) => {
      if (item?.metric.cluster === clusterName) {
        item?.metric.pod.startsWith(VOL_SYNC) &&
          (operatorStatus[VOL_SYNC] = item?.value[1]);
      }
    });
    return operatorStatus as ClusterOperatorStatus;
  }, [csvData, clusterName, podData]);

  return (
    <div className="mco-cluster-app__cluster-health-section">
      <StatusText>{t('Health')}</StatusText>
      <HealthItem
        title={t('Cluster health')}
        state={
          ValidateManagedClusterCondition(
            clusterResources[clusterName]?.managedCluster,
            MANAGED_CLUSTER_CONDITION_AVAILABLE
          )
            ? HealthState.OK
            : HealthState.ERROR
        }
      />
      <HealthItem
        title={t('Operators health')}
        // for csv status metrics, '1' means healthy
        state={
          clusterOperatorStatus?.[ODR_CLUSTER_OPERATOR] !== '1' ||
          clusterOperatorStatus?.[VOL_SYNC] !== '1'
            ? HealthState.ERROR
            : HealthState.OK
        }
      >
        <OperatorsHealthPopUp clusterOperatorStatus={clusterOperatorStatus} />
      </HealthItem>
    </div>
  );
};

export const PeerConnectionSection: React.FC<PeerConnectionSectionProps> = ({
  peerClusters,
}) => {
  const { t } = useCustomTranslation();
  // Exclude the selected cluster
  const peerConnectedCount = !!peerClusters.length
    ? peerClusters.length - 1
    : 0;
  return (
    <div className="mco-dashboard__contentColumn">
      <StatusText>{t('Peer connection')}</StatusText>
      <StatusIconAndText
        title={t(' {{ peerConnectedCount }} Connected', {
          peerConnectedCount,
        })}
        icon={<ConnectedIcon />}
        className="text-muted"
      />
    </div>
  );
};

const ProtectedAppStatus: React.FC<ProtectedAppStatusProps> = ({
  text,
  healthyCount,
  issueCount,
}) => {
  return (
    <>
      <GridItem lg={9} sm={6}>
        <Content
          component="p"
          className="text-muted mco-dashboard__statusText--margin"
        >
          {text}
        </Content>
      </GridItem>
      <GridItem lg={2} sm={2}>
        <StatusIconAndText
          title={healthyCount.toString()}
          icon={<GreenCheckCircleIcon />}
          className="pf-v6-u-text-align-center"
        />
      </GridItem>
      <GridItem lg={1} sm={4}>
        <StatusIconAndText
          title={issueCount.toString()}
          icon={<YellowExclamationTriangleIcon />}
        />
      </GridItem>
    </>
  );
};

export const ApplicationsSection: React.FC<ApplicationsSectionProps> = ({
  clusterResources,
  clusterName,
  lastSyncTimeData,
}) => {
  const { t } = useCustomTranslation();

  const appsWithIssues = React.useMemo(
    () =>
      clusterResources[clusterName]?.protectedApps?.reduce(
        (acc, protectedAppMap) => {
          const hasVolumeReplicationIssue = checkVolumeReplicationHealth(
            protectedAppMap,
            lastSyncTimeData
          );
          const hasKubeObjBackupIssue =
            checkKubeObjBackupHealth(protectedAppMap);
          const hasIssue = hasVolumeReplicationIssue || hasKubeObjBackupIssue;
          hasIssue &&
            ++acc[protectedAppMap.appType === DRApplication.DISCOVERED ? 0 : 1];
          return acc;
        },
        [0, 0]
      ) || [0, 0],
    [clusterResources, clusterName, lastSyncTimeData]
  );

  const protectedAppCount =
    clusterResources[clusterName]?.protectedApps?.length;

  // All discovered are protected apps
  const protectedDiscoveredApps =
    clusterResources[clusterName]?.totalDiscoveredAppsCount;
  const protectedManagedApps = protectedAppCount - protectedDiscoveredApps;

  return (
    <div className="mco-dashboard__contentColumn">
      <Content component={ContentVariants.h1}>{protectedAppCount}</Content>
      <StatusText>{t('Protected applications')}</StatusText>
      <Grid hasGutter className="pf-v6-u-w-75">
        <ProtectedAppStatus
          text={t('ACM discovered applications: ')}
          healthyCount={protectedDiscoveredApps - appsWithIssues[0]}
          issueCount={appsWithIssues[0]}
        />
        <ProtectedAppStatus
          text={t('ACM managed applications: ')}
          healthyCount={protectedManagedApps - appsWithIssues[1]}
          issueCount={appsWithIssues[1]}
        />
      </Grid>
    </div>
  );
};

const getDescription = (result: PrometheusResult, _index: number) =>
  // Returning cluster name as a description
  result.metric?.['cluster'] || '';

export const SnapshotUtilizationCard: React.FC<
  SnapshotUtilizationCardProps
> = ({
  title,
  titleToolTip,
  queryType,
  humanizeValue,
  clusters,
  CustomUtilizationSummary,
}) => {
  return (
    <>
      <div>
        <StatusText>
          {title}
          {!!titleToolTip && <FieldLevelHelp>{titleToolTip}</FieldLevelHelp>}
        </StatusText>
      </div>
      <PrometheusUtilizationItem
        title={''}
        utilizationQuery={
          !!clusters.length &&
          getRBDSnapshotUtilizationQuery(clusters, queryType)
        }
        humanizeValue={humanizeValue}
        basePath={ACM_ENDPOINT}
        chartType="grouped-line"
        description={getDescription}
        hideCurrentHumanized
        hideHorizontalBorder
        disableGraphLink
        showLegend
        CustomUtilizationSummary={CustomUtilizationSummary}
      />
    </>
  );
};

const CustomUtilizationSummary: React.FC<CustomUtilizationSummaryProps> = ({
  currentHumanized,
  utilizationData,
}) => {
  const { t } = useCustomTranslation();
  const maxVal = getMax(utilizationData);
  const minVal = getMin(utilizationData);
  const humanizedMax = !!maxVal
    ? humanizeDecimalBytesPerSec(maxVal).string
    : null;
  const humanizedMin = !!minVal
    ? humanizeDecimalBytesPerSec(minVal).string
    : null;

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

export const UtilizationCard: React.FC<UtilizationCardProps> = ({
  clusterName,
  peerClusters,
}) => {
  const { t } = useCustomTranslation();

  return (
    <div className="mco-dashboard__contentColumn">
      <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--spaceBetween">
        <Content
          component={ContentVariants.h3}
          className="mco-cluster-app__contentRow--flexStart"
        >
          {t('Utilization')}
        </Content>
        <div className="mco-dashboard__contentRow mco-cluster-app__contentRow--flexEnd">
          <UtilizationDurationDropdown />
        </div>
      </div>
      <div className="mco-cluster-app__graph--margin-bottom">
        <SnapshotUtilizationCard
          clusters={peerClusters}
          title={t('Block volumes snapshots synced')}
          queryType={DRDashboard.RBD_SNAPSHOT_SNAPSHOTS}
          titleToolTip={t(
            'The graph displays the total number of block volumes inbound snapshots, by cluster, from all ApplicationSet and Subscription type applications. Applications that use file volumes are excluded in the total snapshot count.'
          )}
          humanizeValue={humanizeNumber}
        />
      </div>
      <div className="mco-cluster-app__graph--margin-bottom">
        <SnapshotUtilizationCard
          clusters={[clusterName]}
          title={t('Block volumes replication throughput')}
          queryType={DRDashboard.RBD_SNAPSHOTS_SYNC_BYTES}
          humanizeValue={humanizeDecimalBytesPerSec}
          titleToolTip={t(
            'The graph displays the average replication throughput inbound, by cluster, from all ApplicationSet and Subscription type applications. Applications that use file volumes are excluded in the replication throughput.'
          )}
          CustomUtilizationSummary={CustomUtilizationSummary}
        />
      </div>
    </div>
  );
};

type ClusterOperatorStatus = {
  [ODR_CLUSTER_OPERATOR]: string;
  [VOL_SYNC]: string;
};

type OperatorsHealthPopUpProps = {
  clusterOperatorStatus: ClusterOperatorStatus;
};

type HealthSectionProps = {
  clusterResources: DRClusterAppsMap;
  csvData: PrometheusResponse;
  clusterName: string;
  podData: PrometheusResponse;
};

type PeerConnectionSectionProps = {
  peerClusters: string[];
};

type ApplicationsSectionProps = {
  clusterResources: DRClusterAppsMap;
  clusterName: string;
  lastSyncTimeData: PrometheusResponse;
};

type SnapshotUtilizationCardProps = {
  title: string;
  queryType: DRDashboard;
  humanizeValue: Humanize;
  chartLabel?: string;
  clusters?: string[];
  titleToolTip: JSX.Element;
  CustomUtilizationSummary?: React.FC<CustomUtilizationSummaryProps>;
};

type UtilizationCardProps = {
  clusterName: string;
  peerClusters: string[];
};

type ProtectedAppStatusProps = {
  text: string;
  healthyCount: number;
  issueCount: number;
};
