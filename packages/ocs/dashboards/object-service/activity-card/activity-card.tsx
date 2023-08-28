import * as React from 'react';
import { RGW_FLAG } from '@odf/core/features';
import { secretResource } from '@odf/core/resources';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { EventModel } from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getResiliencyProgress } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ActivityBody,
  RecentEventsBody,
  OngoingActivityBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import { Card, CardHeader, CardTitle } from '@patternfly/react-core';
import {
  dataResiliencyQueryMap,
  ObjectServiceDashboardQuery,
} from '../../../queries';
import { isObjectStorageEvent, decodeRGWPrefix } from '../../../utils';
import './activity-card.scss';
import './../../../style.scss';

const eventsResource = { isList: true, kind: EventModel.kind };

const RecentEvent: React.FC = () => {
  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);
  return (
    <RecentEventsBody
      events={{ data, loaded, loadError }}
      filter={isObjectStorageEvent}
    />
  );
};

const OngoingActivity: React.FC = () => {
  const [data, loaded, loadError] =
    useK8sWatchResource<K8sResourceKind>(secretResource);
  const isRGWSupported = useFlag(RGW_FLAG);

  const rgwPrefix = React.useMemo(
    () => (isRGWSupported && loaded && !loadError ? decodeRGWPrefix(data) : ''),
    [data, loaded, loadError, isRGWSupported]
  );
  const rgwResiliencyQuery =
    dataResiliencyQueryMap[
      ObjectServiceDashboardQuery.RGW_REBUILD_PROGRESS_QUERY
    ](rgwPrefix);

  const [progress, progressError] = useCustomPrometheusPoll({
    query: dataResiliencyQueryMap.MCG_REBUILD_PROGRESS_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [eta] = useCustomPrometheusPoll({
    query: dataResiliencyQueryMap.MCG_REBUILD_TIME_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [rgwProgress, rgwProgressError] = useCustomPrometheusPoll({
    query: rgwResiliencyQuery,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const prometheusActivities = [];

  if (getResiliencyProgress(progress) < 1) {
    prometheusActivities.push({
      results: [progress, eta],
      loader: () =>
        import('./data-resiliency-activity/data-resiliency-activity').then(
          (m) => m.NoobaaDataResiliency
        ),
    });
  }

  if (isRGWSupported && getResiliencyProgress(rgwProgress) < 1) {
    prometheusActivities.push({
      results: [rgwProgress],
      loader: () =>
        import('./data-resiliency-activity/data-resiliency-activity').then(
          (m) => m.NoobaaDataResiliency
        ),
    });
  }

  return (
    <OngoingActivityBody
      loaded={
        (progress || progressError) &&
        (isRGWSupported ? rgwProgress || rgwProgressError : true)
      }
      prometheusActivities={prometheusActivities}
    />
  );
};

const ActivityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <ActivityBody className="nb-activity-card__body">
        <OngoingActivity />
        <RecentEvent />
      </ActivityBody>
    </Card>
  );
};

export default ActivityCard;
