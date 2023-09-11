import * as React from 'react';
import { MANAGED_CLUSTER_CONDITION_AVAILABLE } from '@odf/mco/constants';
import { DrClusterAppsMap } from '@odf/mco/types';
import { getManagedClusterCondition } from '@odf/mco/utils';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { DataUnavailableError } from '@odf/shared/generic/Error';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import {
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Divider,
  Text,
} from '@patternfly/react-core';
import { DRResourcesContext } from '../dr-dashboard-context';
import './summary-card.scss';

type SummaryMap = {
  clusters: {
    totalCount: number;
    withIssuesCount: number;
  };
  applications: {
    totalCount: number;
    protectedCount: number;
  };
};

const getClusterSummary = (
  drClusterAppsMap: DrClusterAppsMap,
  loaded: boolean,
  loadError: any
): SummaryMap => {
  const summaryMap: SummaryMap = {
    clusters: { totalCount: 0, withIssuesCount: 0 },
    applications: { totalCount: 0, protectedCount: 0 },
  };
  if (loaded && !loadError) {
    const drClusters = Object.keys(drClusterAppsMap);
    summaryMap.clusters.totalCount = drClusters?.length;
    drClusters?.forEach((cluster) => {
      summaryMap.applications.totalCount =
        summaryMap.applications.totalCount +
        drClusterAppsMap[cluster].totalAppSetsCount;
      summaryMap.applications.protectedCount =
        summaryMap.applications.protectedCount +
        drClusterAppsMap[cluster].protectedAppSets.length;
      const isClusterHealthy = !!getManagedClusterCondition(
        drClusterAppsMap[cluster]?.managedCluster,
        MANAGED_CLUSTER_CONDITION_AVAILABLE
      );
      if (!isClusterHealthy) {
        summaryMap.clusters.withIssuesCount =
          summaryMap.clusters.withIssuesCount + 1;
      }
    });
  }
  return summaryMap;
};

export const SummaryCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const { drClusterAppsMap, loaded, loadError } =
    React.useContext(DRResourcesContext);

  const summaryMap: SummaryMap = getClusterSummary(
    drClusterAppsMap,
    loaded,
    loadError
  );
  const healthyClusters =
    summaryMap.clusters.totalCount - summaryMap.clusters.withIssuesCount;
  return (
    <Card data-test="cluster-summary-card">
      <CardBody>
        {loaded && !loadError && (
          <Gallery hasGutter>
            <GalleryItem className="mco-dashboard__contentColumn">
              <Text className="text-muted mco-dashboard__statusText--margin mco-dashboard__statusText--size">
                {t('Clusters')}
              </Text>
              <Text className="mco-dashboard__statusText--margin mco-summary__countText--size mco-dashboard__statusText--weight">
                {summaryMap.clusters.totalCount}
              </Text>
              <Divider className="mco-summary__divider--width mco-dashboard__statusText--margin" />
              <HealthItem
                title={t('{{ healthy }} healthy', {
                  healthy: healthyClusters,
                })}
                state={HealthState.OK}
                disableDetails={true}
                className="text-muted mco-dashboard__statusText--margin"
              />
              <HealthItem
                title={t('{{ issues }} with issues', {
                  issues: summaryMap.clusters.withIssuesCount,
                })}
                state={HealthState.ERROR}
                disableDetails={true}
                className="text-muted"
              />
            </GalleryItem>
            <GalleryItem className="mco-dashboard__contentColumn">
              <Text className="text-muted mco-dashboard__statusText--margin mco-dashboard__statusText--size">
                {t('Applications')}
              </Text>
              <Text className="mco-dashboard__statusText--margin mco-summary__countText--size mco-dashboard__statusText--weight">
                {summaryMap.applications.totalCount}
              </Text>
              <Divider className="mco-summary__divider--width mco-dashboard__statusText--margin" />
              <Text className="text-muted">
                {t('{{ protected }} DR protected', {
                  protected: summaryMap.applications.protectedCount,
                })}
              </Text>
            </GalleryItem>
          </Gallery>
        )}
        {!loaded && !loadError && <DataLoadingState />}
        {loadError && loaded && (
          <div className="mco-dashboard__centerComponent">
            <DataUnavailableError />
          </div>
        )}
      </CardBody>
    </Card>
  );
};

const DataLoadingState: React.FC = () => {
  return (
    <Gallery hasGutter>
      <GalleryItem>
        <div className="mco-dashboard-loading__singleBlockSmall"></div>
      </GalleryItem>
      <GalleryItem>
        <div className="mco-dashboard-loading__singleBlockSmall"></div>
      </GalleryItem>
    </Gallery>
  );
};
