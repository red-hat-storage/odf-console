import * as React from 'react';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { ODFSystemFlagsPayload } from '@odf/core/redux/actions';
import { secretResource } from '@odf/core/resources';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { EventModel } from '@odf/shared/models';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import { getResiliencyProgress } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import {
  ActivityBody,
  RecentEventsBody,
  OngoingActivityBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { EventKind } from '@openshift-console/dynamic-plugin-sdk-internal/lib/api/internal-types';
import { useParams } from 'react-router-dom-v5-compat';
import { Card, CardHeader, CardTitle, CardBody } from '@patternfly/react-core';
import {
  dataResiliencyQueryMap,
  ObjectServiceDashboardQuery,
} from '../../../queries';
import { ODFSystemParams } from '../../../types';
import { isObjectStorageEvent, decodeRGWPrefix } from '../../../utils';
import '../../../style.scss';
import './activity-card.scss';

const eventsResource = { isList: true, kind: EventModel.kind };

type ActivityProps = {
  systemFlags: ODFSystemFlagsPayload['systemFlags'];
  clusterNs: string;
};

const RecentEvent: React.FC<ActivityProps> = ({ systemFlags, clusterNs }) => {
  const isRGWSupported = systemFlags[clusterNs]?.isRGWAvailable;
  const isMCGSupported = systemFlags[clusterNs]?.isNoobaaAvailable;

  const [data, loaded, loadError] =
    useK8sWatchResource<EventKind[]>(eventsResource);
  return (
    <RecentEventsBody
      events={{ data, loaded, loadError }}
      filter={isObjectStorageEvent(isRGWSupported, isMCGSupported)}
    />
  );
};

const OngoingActivity: React.FC<ActivityProps> = ({
  systemFlags,
  clusterNs,
}) => {
  const isRGWSupported = systemFlags[clusterNs]?.isRGWAvailable;
  const isMCGSupported = systemFlags[clusterNs]?.isNoobaaAvailable;
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const [data, loaded, loadError] = useK8sWatchResource<K8sResourceKind>(
    secretResource(clusterNs)
  );

  const rgwPrefix = React.useMemo(
    () => (isRGWSupported && loaded && !loadError ? decodeRGWPrefix(data) : ''),
    [data, loaded, loadError, isRGWSupported]
  );
  const rgwResiliencyQuery = dataResiliencyQueryMap[
    ObjectServiceDashboardQuery.RGW_REBUILD_PROGRESS_QUERY
  ](rgwPrefix, managedByOCS);

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

  if (isMCGSupported && getResiliencyProgress(progress) < 1) {
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
        (isMCGSupported ? progress || progressError : true) &&
        (isRGWSupported ? rgwProgress || rgwProgressError : true)
      }
      prometheusActivities={prometheusActivities}
    />
  );
};

const ActivityCard: React.FC = () => {
  const { t } = useCustomTranslation();

  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Activity')}</CardTitle>
      </CardHeader>
      <CardBody>
        <ActivityBody className="nb-activity-card__body">
          <OngoingActivity systemFlags={systemFlags} clusterNs={clusterNs} />
          <RecentEvent systemFlags={systemFlags} clusterNs={clusterNs} />
        </ActivityBody>
      </CardBody>
    </Card>
  );
};

export default ActivityCard;
