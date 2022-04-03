import * as React from 'react';
import { RGW_FLAG } from '@odf/core/features';
import { CephObjectStoreModel } from '@odf/core/models';
import { NooBaaSystemModel } from '@odf/core/models';
import { secretResource } from '@odf/core/resources';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { K8sResourceKind } from '@odf/shared/types';
import { alertURL } from '@odf/shared/utils';
import { referenceForModel } from '@odf/shared/utils';
import {
  useK8sWatchResource,
  useFlag,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  AlertsBody,
  AlertItem,
  HealthBody,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  Gallery,
  GalleryItem,
  Card,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { StatusType } from '../../../constants';
import { getDataResiliencyState } from '../../../dashboards/persistent-internal/status-card/utils';
import {
  StatusCardQueries,
  dataResiliencyQueryMap,
  ObjectServiceDashboardQuery,
} from '../../../queries';
import {
  getAlertsFromRules,
  filterNooBaaAlerts,
  filterRGWAlerts,
  decodeRGWPrefix,
} from '../../../utils';
import { ObjectServiceStatus } from './object-service-health';
import { getNooBaaState, getRGWHealthState } from './statuses';
import './status-card.scss';

const noobaaResource = {
  kind: referenceForModel(NooBaaSystemModel),
  isList: true,
};

const cephObjectStoreResource = {
  kind: referenceForModel(CephObjectStoreModel),
  isList: true,
};

const ObjectStorageAlerts = () => {
  const [data, loaded, loadError] = useAlerts();
  const alerts = data
    ? [
        ...filterNooBaaAlerts(getAlertsFromRules(data?.data?.groups)),
        ...filterRGWAlerts(getAlertsFromRules(data?.data?.groups)),
      ]
    : [];

  return (
    <AlertsBody error={!_.isEmpty(loadError)}>
      {loaded &&
        alerts.length > 0 &&
        alerts.map((alert) => (
          <AlertItem
            key={alertURL(alert, alert?.rule?.id)}
            alert={alert as any}
          />
        ))}
    </AlertsBody>
  );
};

const StatusCard: React.FC<{}> = () => {
  const isRGWSupported = useFlag(RGW_FLAG);
  const { t } = useTranslation();

  const [secretData, secretLoaded, secretLoadError] =
    useK8sWatchResource<K8sResourceKind>(secretResource);
  const [noobaa, noobaaLoaded, noobaaLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(noobaaResource);
  const [rgw, rgwLoaded, rgwLoadError] = useK8sWatchResource<K8sResourceKind[]>(
    cephObjectStoreResource
  );

  const rgwPrefix = React.useMemo(
    () =>
      isRGWSupported && secretLoaded && !secretLoadError
        ? decodeRGWPrefix(secretData)
        : '',
    [secretData, secretLoaded, secretLoadError, isRGWSupported]
  );

  const rgwResiliencyQuery =
    dataResiliencyQueryMap[
      ObjectServiceDashboardQuery.RGW_REBUILD_PROGRESS_QUERY
    ](rgwPrefix);

  const [healthStatusResult, healthStatusError] = useCustomPrometheusPoll({
    query: StatusCardQueries.HEALTH_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [progressResult, progressError] = useCustomPrometheusPoll({
    query: StatusCardQueries.MCG_REBUILD_PROGRESS_QUERY,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });
  const [rgwResiliencyResult, rgwResiliencyError] = useCustomPrometheusPoll({
    query: rgwResiliencyQuery,
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const MCGState = getNooBaaState(
    [{ response: healthStatusResult, error: healthStatusError }],
    t,
    {
      loaded: noobaaLoaded,
      loadError: noobaaLoadError,
      data: noobaa,
    }
  );

  const RGWState =
    !rgwLoadError && rgwLoaded ? getRGWHealthState(rgw[0]) : undefined;

  const dataResiliencyState: SubsystemHealth = getDataResiliencyState(
    [{ response: progressResult, error: progressError }],
    t
  );

  const RGWResiliencyState = getDataResiliencyState(
    [{ response: rgwResiliencyResult, error: rgwResiliencyError }],
    t
  );

  return (
    <Card className="co-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <HealthBody>
        <Gallery className="nb-status-card__health" hasGutter>
          <GalleryItem>
            <ObjectServiceStatus
              RGWMetrics={isRGWSupported ? RGWState : undefined}
              MCGMetrics={MCGState}
              statusType={StatusType.HEALTH}
            />
          </GalleryItem>
          <GalleryItem>
            <ObjectServiceStatus
              RGWMetrics={isRGWSupported ? RGWResiliencyState : undefined}
              MCGMetrics={dataResiliencyState}
              statusType={StatusType.RESILIENCY}
            />
          </GalleryItem>
        </Gallery>
      </HealthBody>
      <ObjectStorageAlerts />
    </Card>
  );
};

export default StatusCard;
