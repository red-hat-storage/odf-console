import * as React from 'react';
import { useSafeK8sWatchResource } from '@odf/core/hooks';
import { K8sResourceObj } from '@odf/core/types';
import { useGetOCSHealth } from '@odf/ocs/hooks';
import { StorageConsumerKind } from '@odf/shared';
import { StorageConsumerModel } from '@odf/shared';
import { ODF_OPERATOR } from '@odf/shared/constants';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { healthStateMap } from '@odf/shared/dashboards/status-card/states';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { useWatchStorageSystems } from '@odf/shared/hooks/useWatchStorageSystems';
import { StorageClusterModel } from '@odf/shared/models';
import { getName, getNamespace } from '@odf/shared/selectors';
import { ClusterServiceVersionKind } from '@odf/shared/types';
import { useCustomTranslation } from '@odf/shared/useCustomTranslationHook';
import {
  getGVK,
  referenceForModel,
  referenceForGroupVersionKind,
  getOperatorHealthState,
} from '@odf/shared/utils';
import {
  HealthState,
  useFlag,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useNavigate } from 'react-router-dom-v5-compat';
import {
  Gallery,
  GalleryItem,
  pluralize,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { PROVIDER_MODE } from '../../../features';
import { getVendorDashboardLinkFromMetrics } from '../../utils';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import StatusCardPopover from './status-card-popover';
import { getAggregateClientHealthState, getClientText } from './utils';
import '../../../style.scss';

const operatorResource: K8sResourceObj = (ns) => ({
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: ns,
  isList: true,
});

export const StatusCard: React.FC = () => {
  const { t } = useCustomTranslation();
  const [csvData, csvLoaded, csvLoadError] =
    useSafeK8sWatchResource<ClusterServiceVersionKind[]>(operatorResource);
  const [systems, systemsLoaded, systemsLoadError] = useWatchStorageSystems();
  const [healthData, healthError, healthLoading] = useCustomPrometheusPoll({
    query: STATUS_QUERIES[StorageDashboard.HEALTH],
    endpoint: 'api/v1/query' as any,
    basePath: usePrometheusBasePath(),
  });

  const operator = csvData?.find((csv) =>
    csv.metadata.name.startsWith(ODF_OPERATOR)
  );
  const operatorStatus = operator?.status?.phase;

  // Todo(bipuladh): In 4.11 this should come in from an extension point
  const ocsHealthStatuses = useGetOCSHealth(null);

  const parsedHealthData =
    !healthError &&
    !healthLoading &&
    systemsLoaded &&
    !systemsLoadError &&
    healthData
      ? healthData?.data?.result?.reduce((acc, curr) => {
          const systemName = curr.metric.storage_system;
          // ToDo (epic 4422): This equality check should work (for now) as "storage_system" will be unique,
          // but moving forward add a label to metric for StorageSystem namespace as well and use that instead (update query as well).
          // Equality check should be updated as well with "&&" condition on StorageSystem namespace.
          const storageSystem = systems.find(
            (system) => getName(system) === systemName
          );
          const systemNamespace = getNamespace(storageSystem);
          const ocsHealthStatus =
            ocsHealthStatuses[`${systemName}${systemNamespace}`];
          const { apiGroup, apiVersion, kind } = getGVK(
            storageSystem?.spec.kind
          );
          const systemKind =
            referenceForGroupVersionKind(apiGroup)(apiVersion)(kind);
          const systemData =
            apiGroup === StorageClusterModel.apiGroup
              ? {
                  systemName,
                  rawHealthData: ocsHealthStatus.rawHealthState,
                  healthState: healthStateMap(ocsHealthStatus.rawHealthState),
                  link: getVendorDashboardLinkFromMetrics(
                    systemKind,
                    systemName,
                    systemNamespace,
                    ocsHealthStatus.errorComponent
                  ),

                  ...(ocsHealthStatus.errorMessages
                    ? { extraTexts: ocsHealthStatus.errorMessages }
                    : {}),
                }
              : {
                  systemName,
                  rawHealthData: curr.value[1],
                  healthState: healthStateMap(curr.value[1]),
                  link: getVendorDashboardLinkFromMetrics(
                    systemKind,
                    systemName,
                    systemNamespace
                  ),
                };
          return [...acc, systemData];
        }, [])
      : [];

  const healthySystems = parsedHealthData.filter(
    (item) => item.rawHealthData === '0'
  );
  const unHealthySystems = parsedHealthData.filter(
    (item) => item.rawHealthData !== '0'
  );

  const operatorHealthStatus = getOperatorHealthState(
    operatorStatus,
    !csvLoaded,
    csvLoadError
  );

  const isProviderMode = useFlag(PROVIDER_MODE);

  const [clients, clientsLoaded, clientsLoadError] = useK8sWatchResource<
    StorageConsumerKind[]
  >({
    kind: referenceForModel(StorageConsumerModel),
    isList: true,
  });

  const clientAggregateHealth = getAggregateClientHealthState(clients);

  const navigate = useNavigate();

  const redirectToListPage = React.useCallback(() => {
    navigate('/odf/storage-consumers');
  }, [navigate]);

  return (
    <Card className="odfDashboard-card--height">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <Gallery className="odf-overview-status__health" hasGutter>
          <GalleryItem>
            <HealthItem
              title={t('Data Foundation')}
              state={operatorHealthStatus.state}
            />
          </GalleryItem>
          {healthySystems.length > 0 && (
            <GalleryItem>
              <HealthItem
                title={pluralize(healthySystems.length, t('Storage system'))}
                state={HealthState.OK}
              >
                <StatusCardPopover
                  resourceHealthMap={healthySystems}
                  firstColumnName={t('Storage system')}
                  secondColumnName={t('Health')}
                />
              </HealthItem>
            </GalleryItem>
          )}
          {unHealthySystems.length > 0 && (
            <GalleryItem>
              <HealthItem
                title={pluralize(unHealthySystems.length, 'Storage system')}
                state={HealthState.ERROR}
                maxWidth="35rem"
              >
                <StatusCardPopover
                  resourceHealthMap={unHealthySystems}
                  firstColumnName={t('Storage system')}
                  secondColumnName={t('Health')}
                />
              </HealthItem>
            </GalleryItem>
          )}
          {isProviderMode && clientsLoaded && !clientsLoadError && (
            <GalleryItem>
              <HealthItem
                title={t('Storage consumers')}
                state={clientAggregateHealth}
                onClick={redirectToListPage}
                details={getClientText(clients, t)}
              />
            </GalleryItem>
          )}
        </Gallery>
      </CardBody>
    </Card>
  );
};
