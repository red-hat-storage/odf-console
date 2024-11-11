import * as React from 'react';
import { useODFNamespaceSelector } from '@odf/core/redux';
import { PVC_PROVISIONER_ANNOTATION } from '@odf/ocs/constants';
import {
  eventsResource,
  pvcResource,
} from '@odf/ocs/dashboards/persistent-internal/activity-card/activity-card';
import { isSubscriptionUpgradeActivity } from '@odf/ocs/dashboards/persistent-internal/activity-card/ocs-upgrade-activity';
import { isCephProvisioner, isPersistentStorageEvent } from '@odf/ocs/utils';
import { useDeepCompareMemoize } from '@odf/shared/hooks/deep-compare-memoize';
import { SubscriptionModel } from '@odf/shared/models';
import { getAnnotations, getName } from '@odf/shared/selectors';
import {
  K8sResourceKind,
  PersistentVolumeClaimKind,
  SubscriptionKind,
} from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/internal-types';
import {
  ActivityBody,
  ActivityItem,
  OngoingActivityBody,
  RecentEventsBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { Card, CardHeader, CardTitle, CardBody } from '@patternfly/react-core';
import { CLIENT_OPERATOR } from '../../../constants';
import '../../../../style.scss';
import './activity-card.scss';

const ClientOperatorUpgradeActivity: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <ActivityItem>
      {t('Upgrading Data Foundation Client Operator')}
    </ActivityItem>
  );
};

const getClientOperatorSubscription = (
  subscriptions: K8sResourceKind[]
): SubscriptionKind =>
  _.find(
    subscriptions,
    (item) => item?.spec?.name === CLIENT_OPERATOR
  ) as SubscriptionKind;

const RecentEvent: React.FC = () => {
  const { odfNamespace } = useODFNamespaceSelector();

  const [pvcs, pvcLoaded, pvcLoadError] =
    useK8sWatchResource<PersistentVolumeClaimKind[]>(pvcResource);
  const [events, eventsLoaded, eventsLoadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);

  const validPVC = pvcs
    .filter((obj) =>
      isCephProvisioner(getAnnotations(obj)?.[PVC_PROVISIONER_ANNOTATION])
    )
    .map(getName);
  const memoizedPVCNames = useDeepCompareMemoize(validPVC, true);

  const clientEventsFilter = React.useCallback(
    () => isPersistentStorageEvent(memoizedPVCNames, odfNamespace),
    [memoizedPVCNames, odfNamespace]
  );

  const eventObject = {
    data: events,
    loaded: eventsLoaded && pvcLoaded,
    kind: 'Event',
    loadError: pvcLoadError || eventsLoadError,
  };

  return (
    <RecentEventsBody events={eventObject} filter={clientEventsFilter()} />
  );
};

export const subscriptionResource = {
  isList: true,
  kind: referenceForModel(SubscriptionModel),
  namespaced: false,
};

const OngoingActivity = () => {
  const [subscriptions, subLoaded] =
    useK8sWatchResource<K8sResourceKind[]>(subscriptionResource);

  const clientOperatorSubscription: SubscriptionKind =
    getClientOperatorSubscription(subscriptions);

  const resourceActivities = [];

  if (isSubscriptionUpgradeActivity(clientOperatorSubscription)) {
    resourceActivities.push({
      resource: clientOperatorSubscription,
      timestamp: clientOperatorSubscription?.status?.lastUpdated,
      loader: () => Promise.resolve(ClientOperatorUpgradeActivity),
    });
  }

  return (
    <OngoingActivityBody
      loaded={subLoaded}
      resourceActivities={resourceActivities}
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
        <ActivityBody className="odf-client-activity-card__body">
          <OngoingActivity />
          <RecentEvent />
        </ActivityBody>
      </CardBody>
    </Card>
  );
});

ActivityCard.displayName = 'ActivityCard';

export default ActivityCard;
