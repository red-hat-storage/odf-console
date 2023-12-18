import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { getStorageClusterInNs } from '@odf/core/utils';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import {
  EventModel,
  PersistentVolumeClaimModel,
  SubscriptionModel,
} from '@odf/shared/models';
import { getAnnotations, getName } from '@odf/shared/selectors';
import {
  K8sResourceKind,
  PersistentVolumeClaimKind,
  SubscriptionKind,
  StorageClusterKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getResiliencyProgress, referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  ActivityBody,
  OngoingActivityBody,
  RecentEventsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import { Card, CardHeader, CardTitle } from '@patternfly/react-core';
import { OCS_OPERATOR, PVC_PROVISIONER_ANNOTATION } from '../../../constants';
import { StorageClusterModel } from '../../../models';
import {
  DATA_RESILIENCY_QUERY,
  StorageDashboardQuery,
} from '../../../queries/ceph-storage';
import { ODFSystemParams } from '../../../types';
import {
  isCephProvisioner,
  isPersistentStorageEvent,
} from '../../../utils/common';
import {
  isClusterExpandActivity,
  ClusterExpandActivity,
} from './cluster-expand-activity';
import {
  isSubscriptionUpgradeActivity,
  OCSUpgradeActivity,
} from './ocs-upgrade-activity';
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

const RecentEvent: React.FC = () => {
  const { namespace: clusterNs } = useParams<ODFSystemParams>();

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

export const subscriptionResource = {
  isList: true,
  kind: referenceForModel(SubscriptionModel),
};

export const storageClusterResource = {
  isList: true,
  kind: referenceForModel(StorageClusterModel),
};

const OngoingActivity = () => {
  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [subscriptions, subLoaded] =
    useK8sWatchResource<K8sResourceKind[]>(subscriptionResource);
  const [clusters, clusterLoaded] = useK8sWatchResource<StorageClusterKind[]>(
    storageClusterResource
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
      loader: () =>
        import(
          '@odf/shared/dashboards/data-resiliency/data-resiliency-activity'
        ).then((m) => m.DataResiliency),
    });
  }

  if (isSubscriptionUpgradeActivity(ocsSubscription)) {
    resourceActivities.push({
      resource: ocsSubscription,
      timestamp: ocsSubscription?.status?.lastUpdated,
      loader: () => Promise.resolve(OCSUpgradeActivity),
    });
  }

  if (isClusterExpandActivity(ocsCluster)) {
    resourceActivities.push({
      resource: ocsCluster,
      timestamp: null,
      loader: () => Promise.resolve(ClusterExpandActivity),
    });
  }

  return (
    <OngoingActivityBody
      loaded={subLoaded && clusterLoaded && !metricsLoading}
      resourceActivities={resourceActivities}
      prometheusActivities={prometheusActivities}
    />
  );
};

export const ActivityCard: React.FC = React.memo(() => {
  const { t } = useCustomTranslation();

  return (
    <Card className="co-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <ActivityBody className="ceph-activity-card__body">
        <OngoingActivity />
        <RecentEvent />
      </ActivityBody>
    </Card>
  );
});

ActivityCard.displayName = 'ActivityCard';

export default ActivityCard;
