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
  VOLUME_REPLICATION_HEALTH,
  OBJECT_NAMESPACE,
  OBJECT_NAME,
  MANAGED_CLUSTER_CONDITION_AVAILABLE,
} from '@odf/mco/constants';
import { DRClusterAppsMap } from '@odf/mco/types';
import {
  getVolumeReplicationHealth,
  ValidateManagedClusterCondition,
} from '@odf/mco/utils';
import { getMax, getMin } from '@odf/shared/charts';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { healthStateMapping } from '@odf/shared/dashboards/status-card/states';
import { PrometheusUtilizationItem } from '@odf/shared/dashboards/utilization-card/prometheus-utilization-item';
import { CustomUtilizationSummaryProps } from '@odf/shared/dashboards/utilization-card/utilization-item';
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
import { Flex, Text, TextVariants } from '@patternfly/react-core';
import { ConnectedIcon } from '@patternfly/react-icons';
import { StatusText } from './common';
import './cluster-app-card.scss';

const OperatorsHealthPopUp: React.FC<OperatorsHealthPopUpProps> = ({
  clusterCSVStatus,
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
                clusterCSVStatus?.[ODR_CLUSTER_OPERATOR] !== '1'
                  ? HealthState.ERROR
                  : HealthState.OK
              ].icon
            }
            value={
              clusterCSVStatus?.[ODR_CLUSTER_OPERATOR] !== '1'
                ? t('Degraded')
                : t('Healthy')
            }
          >
            {t('DR Cluster operator')}
          </Status>
          <Status
            icon={
              healthStateMapping[
                clusterCSVStatus?.[VOL_SYNC] !== '1'
                  ? HealthState.ERROR
                  : HealthState.OK
              ].icon
            }
            value={
              clusterCSVStatus?.[VOL_SYNC] !== '1'
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
}) => {
  const { t } = useCustomTranslation();

  const clusterCSVStatus = React.useMemo(
    () =>
      csvData?.data?.result?.reduce((acc, item: PrometheusResult) => {
        if (item?.metric.cluster === clusterName) {
          item?.metric.name.startsWith(ODR_CLUSTER_OPERATOR) &&
            (acc[ODR_CLUSTER_OPERATOR] = item?.value[1]);
          item?.metric.name.startsWith(VOL_SYNC) &&
            (acc[VOL_SYNC] = item?.value[1]);
        }
        return acc;
      }, {} as ClusterCSVStatus) || ({} as ClusterCSVStatus),
    [csvData, clusterName]
  );

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
          clusterCSVStatus?.[ODR_CLUSTER_OPERATOR] !== '1' ||
          clusterCSVStatus?.[VOL_SYNC] !== '1'
            ? HealthState.ERROR
            : HealthState.OK
        }
      >
        <OperatorsHealthPopUp clusterCSVStatus={clusterCSVStatus} />
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
          const hasIssue = !!protectedAppMap.placementInfo?.find(
            (placementInfo) =>
              !!lastSyncTimeData?.data?.result?.find(
                (item: PrometheusResult) =>
                  item.metric?.[OBJECT_NAMESPACE] ===
                    placementInfo.drpcNamespace &&
                  item.metric?.[OBJECT_NAME] === placementInfo.drpcName &&
                  getVolumeReplicationHealth(
                    Number(item.value[1]) || 0,
                    placementInfo.syncInterval
                  )[0] !== VOLUME_REPLICATION_HEALTH.HEALTHY
              )
          );

          return hasIssue ? acc + 1 : acc;
        },
        0
      ) || 0,
    [clusterResources, clusterName, lastSyncTimeData]
  );

  const totalAppSetsCount = clusterResources[clusterName]?.totalAppCount;
  const protectedAppCount =
    clusterResources[clusterName]?.protectedApps?.length;
  return (
    <div className="mco-dashboard__contentColumn">
      <Text component={TextVariants.h1}>{totalAppSetsCount || 0}</Text>
      <StatusText>{t('Total applications')}</StatusText>
      <Text className="text-muted mco-dashboard__statusText--margin">
        {t(' {{ protectedAppCount }} protected apps', {
          protectedAppCount,
        })}
      </Text>
      <Text className="text-muted">
        {t(
          ' {{ appsWithIssues }} of {{ protectedAppCount }} apps with issues',
          { appsWithIssues, protectedAppCount }
        )}
      </Text>
    </div>
  );
};

const getDescription = (result: PrometheusResult, _index: number) =>
  // Returning cluster name as a description
  result.metric?.['cluster'] || '';

export const SnapshotUtilizationCard: React.FC<SnapshotUtilizationCardProps> =
  ({
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
        <Text
          component={TextVariants.h3}
          className="mco-cluster-app__contentRow--flexStart"
        >
          {t('Utilization')}
        </Text>
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

type ClusterCSVStatus = {
  [ODR_CLUSTER_OPERATOR]: string;
  [VOL_SYNC]: string;
};

type OperatorsHealthPopUpProps = {
  clusterCSVStatus: ClusterCSVStatus;
};

type HealthSectionProps = {
  clusterResources: DRClusterAppsMap;
  csvData: PrometheusResponse;
  clusterName: string;
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
