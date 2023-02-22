import * as React from 'react';
import { DrClusterAppsMap } from '@odf/mco/types';
import { getManagedClusterAvailableCondition } from '@odf/mco/utils';
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
      const isClusterHealthy = !!getManagedClusterAvailableCondition(
        drClusterAppsMap[cluster]?.managedCluster
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
              <div className="text-muted mco-summary__item-padding">
                {t('Clusters')}
              </div>
              <div className="mco-dashboard__title mco-summary__item-padding mco-dashboard__title--size">
                {summaryMap.clusters.totalCount}
              </div>
              <Divider className="mco-summary__divider--width mco-summary__item-padding" />
              <HealthItem
                title={t('{{ healthy }} healthy', {
                  healthy: healthyClusters,
                })}
                state={HealthState.OK}
                disableDetails={true}
                className="mco-summary__item-padding"
              />
              <HealthItem
                title={t('{{ issues }} with issues', {
                  issues: summaryMap.clusters.withIssuesCount,
                })}
                state={HealthState.ERROR}
                disableDetails={true}
                className="mco-summary__item-padding"
              />
            </GalleryItem>
            <GalleryItem className="mco-dashboard__contentColumn">
              <div className="text-muted mco-summary__item-padding">
                {t('Applications')}
              </div>
              <div className="mco-dashboard__title mco-summary__item-padding mco-dashboard__title--size">
                {summaryMap.applications.totalCount}
              </div>
              <Divider className="mco-summary__divider--width mco-summary__item-padding" />
              <div className="text-muted">
                {t('{{ protected }} DR protected', {
                  protected: summaryMap.applications.protectedCount,
                })}
              </div>
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
