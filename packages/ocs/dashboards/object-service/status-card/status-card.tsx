import * as React from 'react';
import { CephObjectStoreModel } from '@odf/core/models';
import { NooBaaSystemModel } from '@odf/core/models';
import { useODFSystemFlagsSelector } from '@odf/core/redux';
import { secretResource } from '@odf/core/resources';
import { getResourceInNs } from '@odf/core/utils';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import useAlerts from '@odf/shared/monitoring/useAlert';
import { K8sResourceKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  alertURL,
  filterNooBaaAlerts,
  filterRGWAlerts,
} from '@odf/shared/utils';
import { referenceForModel } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import {
  AlertsBody,
  AlertItem,
} from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash-es';
import { useParams } from 'react-router-dom-v5-compat';
import {
  Gallery,
  GalleryItem,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
} from '@patternfly/react-core';
import { StatusType } from '../../../constants';
import { getDataResiliencyState } from '../../../dashboards/persistent-internal/status-card/utils';
import {
  StatusCardQueries,
  dataResiliencyQueryMap,
  ObjectServiceDashboardQuery,
} from '../../../queries';
import { ODFSystemParams } from '../../../types';
import { decodeRGWPrefix } from '../../../utils';
import { ObjectServiceStatus } from './object-service-health';
import { getNooBaaState, getRGWHealthState } from './statuses';
import '../../../style.scss';

const noobaaResource = {
  kind: referenceForModel(NooBaaSystemModel),
  isList: true,
};

const cephObjectStoreResource = {
  kind: referenceForModel(CephObjectStoreModel),
  isList: true,
};

const ObjectStorageAlerts = () => {
  const [alerts, loaded, loadError] = useAlerts();
  // ToDo (epic 4422): Get StorageCluster name and namespace from the Alert object
  // and filter Alerts based on that for a particular cluster.
  const filteredAlerts =
    loaded && !loadError && !_.isEmpty(alerts)
      ? [...filterNooBaaAlerts(alerts), ...filterRGWAlerts(alerts)]
      : [];

  return (
    <AlertsBody error={!_.isEmpty(loadError)}>
      {loaded &&
        filteredAlerts.length > 0 &&
        filteredAlerts.map((alert) => (
          <AlertItem
            key={alertURL(alert, alert?.rule?.id)}
            alert={alert as any}
          />
        ))}
    </AlertsBody>
  );
};

const StatusCard: React.FC<{}> = () => {
  const { namespace: clusterNs } = useParams<ODFSystemParams>();
  const { systemFlags } = useODFSystemFlagsSelector();
  const isRGWSupported = systemFlags[clusterNs]?.isRGWAvailable;
  const isMCGSupported = systemFlags[clusterNs]?.isNoobaaAvailable;
  const managedByOCS = systemFlags[clusterNs]?.ocsClusterName;

  const { t } = useCustomTranslation();

  const [secretData, secretLoaded, secretLoadError] =
    useK8sWatchResource<K8sResourceKind>(secretResource(clusterNs));
  const [noobaas, noobaaLoaded, noobaaLoadError] =
    useK8sWatchResource<K8sResourceKind[]>(noobaaResource);
  const [rgws, rgwLoaded, rgwLoadError] = useK8sWatchResource<
    K8sResourceKind[]
  >(cephObjectStoreResource);

  const noobaa = getResourceInNs(noobaas, clusterNs);
  const rgw = getResourceInNs(rgws, clusterNs);

  const rgwPrefix = React.useMemo(
    () =>
      isRGWSupported && secretLoaded && !secretLoadError
        ? decodeRGWPrefix(secretData)
        : '',
    [secretData, secretLoaded, secretLoadError, isRGWSupported]
  );

  const rgwResiliencyQuery = dataResiliencyQueryMap[
    ObjectServiceDashboardQuery.RGW_REBUILD_PROGRESS_QUERY
  ](rgwPrefix, managedByOCS);

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
    !rgwLoadError && rgwLoaded ? getRGWHealthState(rgw) : undefined;

  const dataResiliencyState: SubsystemHealth = getDataResiliencyState(
    [{ response: progressResult, error: progressError }],
    t
  );

  const RGWResiliencyState = getDataResiliencyState(
    [{ response: rgwResiliencyResult, error: rgwResiliencyError }],
    t
  );

  return (
    <Card className="odf-overview-card--gradient">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery className="odf-overview-status__health" hasGutter>
          <GalleryItem>
            <ObjectServiceStatus
              RGWMetrics={isRGWSupported ? RGWState : undefined}
              MCGMetrics={isMCGSupported ? MCGState : undefined}
              statusType={StatusType.HEALTH}
            />
          </GalleryItem>
          <GalleryItem>
            <ObjectServiceStatus
              RGWMetrics={isRGWSupported ? RGWResiliencyState : undefined}
              MCGMetrics={isMCGSupported ? dataResiliencyState : undefined}
              statusType={StatusType.RESILIENCY}
            />
          </GalleryItem>
        </Gallery>
        <ObjectStorageAlerts />
      </CardBody>
    </Card>
  );
};

export default StatusCard;
