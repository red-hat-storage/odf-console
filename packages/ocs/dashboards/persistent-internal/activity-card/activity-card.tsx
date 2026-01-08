import * as React from 'react';
import { OSDMigrationStatus } from '@odf/core/constants';
import { PROVIDER_MODE } from '@odf/core/features';
import { useGetInternalClusterDetails } from '@odf/core/redux/utils';
import {
  getStorageClusterInNs,
  getResourceInNs as getCephClusterInNs,
} from '@odf/core/utils';
import { getOSDMigrationStatus } from '@odf/ocs/utils';
import { OCS_OPERATOR } from '@odf/shared/constants';
import { DataResiliency } from '@odf/shared/dashboards/data-resiliency/data-resiliency-activity';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { CephClusterModel, StorageClusterModel } from '@odf/shared/models';
import { EventModel, PersistentVolumeClaimModel } from '@odf/shared/models';
import { subscriptionResource } from '@odf/shared/resources/common';
import { getAnnotations, getName } from '@odf/shared/selectors';
import {
  K8sResourceKind,
  PersistentVolumeClaimKind,
  SubscriptionKind,
  StorageClusterKind,
  CephClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getResiliencyProgress,
  isCephProvisioner,
  referenceForModel,
} from '@odf/shared/utils';
import { useFlag } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import {
  ActivityBody,
  OngoingActivityBody,
  RecentEventsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { Card, CardHeader, CardTitle, CardBody } from '@patternfly/react-core';
import { PVC_PROVISIONER_ANNOTATION } from '../../../constants';
import {
  DATA_RESILIENCY_QUERY,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';
import { isPersistentStorageEvent } from '../../../utils/common';
import {
  isClusterExpandActivity,
  ClusterExpandActivity,
} from './cluster-expand-activity';
import { ClusterMigrationActivity } from './cluster-migration-activity';
import {
  isSubscriptionUpgradeActivity,
  OCSUpgradeActivity,
} from './ocs-upgrade-activity';
import '../../../style.scss';
import './activity-card.scss';

export const getOCSSubscription = (
  subscriptions: K8sResourceKind[]
): SubscriptionKind =>
  _.find(
    subscriptions,
    (item) => item?.spec?.name === OCS_OPERATOR
  ) as SubscriptionKind;

export const pvcResource = {
  isList: true,
  kind: PersistentVolumeClaimModel.kind,
};

export const eventsResource = {
  isList: true,
  kind: EventModel.kind,
};

const cephClusterResource = {
  kind: referenceForModel(CephClusterModel),
  isList: true,
};

const RecentEvent: React.FC = () => {
  const { clusterNamespace: clusterNs } = useGetInternalClusterDetails();
  const [pvcs, pvcLoaded] =
    useK8sWatchResource<PersistentVolumeClaimKind[]>(pvcResource);
  const [events, eventsLoaded] =
    useK8sWatchResource<EventKind[]>(eventsResource);

  const validPVC = pvcs
    .filter((obj) =>
      isCephProvisioner(getAnnotations(obj)?.[PVC_PROVISIONER_ANNOTATION])
    )
    .map(getName);
  const memoizedPVCNames = useDeepCompareMemoize(validPVC, true);

  const ocsEventsFilter = React.useCallback(
    () => isPersistentStorageEvent(memoizedPVCNames, clusterNs),
    [memoizedPVCNames, clusterNs]
  );

  const eventObject = {
    data: events,
    loaded: eventsLoaded && pvcLoaded,
    kind: 'Event',
    loadError: null,
  };

  return <RecentEventsBody events={eventObject} filter={ocsEventsFilter()} />;
};

export const storageClusterResource = {
  isList: true,
  kind: referenceForModel(StorageClusterModel),
};

const OngoingActivity = () => {
  const { clusterNamespace: clusterNs, clusterName: managedByOCS } =
    useGetInternalClusterDetails();

  const [subscriptions, subLoaded] =
    useK8sWatchResource<K8sResourceKind[]>(subscriptionResource);
  const [clusters, clusterLoaded] = useK8sWatchResource<StorageClusterKind[]>(
    storageClusterResource
  );

  const [cephClusters, cephClustersLoaded] =
    useK8sWatchResource<CephClusterKind[]>(cephClusterResource);

  // Only single cluster per Namespace.
  const cephCluster: CephClusterKind = getCephClusterInNs(
    cephClusters,
    clusterNs
  );

  const [resiliencyMetric, , metricsLoading] = useCustomPrometheusPoll({
    query:
      DATA_RESILIENCY_QUERY(managedByOCS)[
        StorageDashboardQuery.RESILIENCY_PROGRESS
      ],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const ocsSubscription: SubscriptionKind = getOCSSubscription(subscriptions);

  const ocsCluster: K8sResourceKind = getStorageClusterInNs(
    clusters,
    clusterNs
  );

  const prometheusActivities = [];
  const resourceActivities = [];

  if (getResiliencyProgress(resiliencyMetric) < 1) {
    prometheusActivities.push({
      results: resiliencyMetric,
      component: DataResiliency,
    });
  }

  if (isSubscriptionUpgradeActivity(ocsSubscription)) {
    resourceActivities.push({
      resource: ocsSubscription,
      timestamp: ocsSubscription?.status?.lastUpdated,
      component: OCSUpgradeActivity,
    });
  }

  if (isClusterExpandActivity(ocsCluster)) {
    resourceActivities.push({
      resource: ocsCluster,
      timestamp: null,
      component: ClusterExpandActivity,
    });
  }

  const isProviderMode = useFlag(PROVIDER_MODE);
  const osdMigrationStatus = getOSDMigrationStatus(cephCluster);

  // Checks for migration progress and displays a message if migration is in progress.
  // If migration is complete, the UI remains empty.
  if (
    !isProviderMode &&
    [OSDMigrationStatus.PENDING, OSDMigrationStatus.IN_PROGRESS].includes(
      osdMigrationStatus
    )
  ) {
    resourceActivities.push({
      resource: cephCluster,
      timestamp: null,
      component: ClusterMigrationActivity,
    });
  }

  return (
    <OngoingActivityBody
      loaded={
        subLoaded && cephClustersLoaded && clusterLoaded && !metricsLoading
      }
      resourceActivities={resourceActivities}
      prometheusActivities={prometheusActivities}
    />
  );
};

export const ActivityCard: React.FC = React.memo(() => {
  const { t } = useCustomTranslation();

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ActivityBody className="ceph-activity-card__body">
          <OngoingActivity />
          <RecentEvent />
        </ActivityBody>
      </CardBody>
    </Card>
  );
});

ActivityCard.displayName = 'ActivityCard';

export default ActivityCard;
