import * as React from 'react';
import { MANAGED_CLUSTER_CONDITION_AVAILABLE } from '@odf/mco/constants';
import { DRClusterAppsMap } from '@odf/mco/types';
import { ValidateManagedClusterCondition } from '@odf/mco/utils';
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
  Content,
} from '@patternfly/react-core';
import { DRResourcesContext } from '../dr-dashboard-context';

type SummaryMap = {
  clusters: {
    totalCount: number;
    withIssuesCount: number;
  };
  applications: {
    totalDiscovredAppsCount: number;
    totalManagedAppsCount: number;
    protectedCount: number;
  };
};

const getClusterSummary = (
  drClusterAppsMap: DRClusterAppsMap,
  loaded: boolean,
  loadError: any
): SummaryMap => {
  const summaryMap: SummaryMap = {
    clusters: { totalCount: 0, withIssuesCount: 0 },
    applications: {
      totalManagedAppsCount: 0,
      totalDiscovredAppsCount: 0,
      protectedCount: 0,
    },
  };
  if (loaded && !loadError) {
    const drClusters = Object.keys(drClusterAppsMap);
    summaryMap.clusters.totalCount = drClusters?.length;
    drClusters?.forEach((cluster) => {
      summaryMap.applications.totalManagedAppsCount =
        summaryMap.applications.totalManagedAppsCount +
        drClusterAppsMap[cluster].totalManagedAppsCount;
      summaryMap.applications.totalDiscovredAppsCount =
        summaryMap.applications.totalDiscovredAppsCount +
        drClusterAppsMap[cluster].totalDiscoveredAppsCount;
      summaryMap.applications.protectedCount =
        summaryMap.applications.protectedCount +
        drClusterAppsMap[cluster].protectedApps.length;
      const isClusterHealthy = ValidateManagedClusterCondition(
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
  const totalAppCount =
    summaryMap.applications.totalDiscovredAppsCount +
    summaryMap.applications.totalManagedAppsCount;
  return (
    <Card data-test="cluster-summary-card">
      <CardBody>
        {loaded && !loadError && (
          <Gallery hasGutter>
            <GalleryItem className="mco-dashboard__contentColumn">
              <Content
                component="p"
                className="text-muted mco-dashboard__statusText--margin mco-dashboard__statusText--size"
              >
                {t('Clusters')}
              </Content>
              <Content
                component="p"
                className="mco-dashboard__statusText--margin pf-v6-u-font-size-4xl mco-dashboard__statusText--weight"
              >
                {summaryMap.clusters.totalCount}
              </Content>
              <Content
                component="p"
                className="text-muted mco-dashboard__statusText--margin"
              >
                {t('in disaster recovery relationship')}
              </Content>
              <Divider className="pf-v6-u-w-75 mco-dashboard__statusText--margin" />
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
              <Content
                component="p"
                className="text-muted mco-dashboard__statusText--margin mco-dashboard__statusText--size"
              >
                {t('Applications')}
              </Content>
              <Content
                component="p"
                className="mco-dashboard__statusText--margin pf-v6-u-font-size-4xl mco-dashboard__statusText--weight"
              >
                {totalAppCount}
              </Content>
              <Content
                component="p"
                className="text-muted mco-dashboard__statusText--margin"
              >
                {t('enrolled in disaster recovery')}
              </Content>
              <Divider className="pf-v6-u-w-75 mco-dashboard__statusText--margin" />
              <Content
                component="p"
                className="text-muted mco-dashboard__statusText--margin"
              >
                {t('ACM discovered applications: {{count}}', {
                  count: summaryMap.applications.totalDiscovredAppsCount,
                })}
              </Content>
              <Content component="p" className="text-muted">
                {t('ACM managed applications: {{count}}', {
                  count: summaryMap.applications.totalManagedAppsCount,
                })}
              </Content>
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
