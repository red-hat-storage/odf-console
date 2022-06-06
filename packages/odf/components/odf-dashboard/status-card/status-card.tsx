import * as React from 'react';
import { useGetOCSHealth } from '@odf/ocs/hooks';
import { ODF_OPERATOR } from '@odf/shared/constants';
import HealthItem from '@odf/shared/dashboards/status-card/HealthItem';
import { healthStateMap } from '@odf/shared/dashboards/status-card/states';
import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';
import { OCSStorageClusterModel, ODFStorageSystem } from '@odf/shared/models';
import {
  ClusterServiceVersionKind,
  StorageSystemKind,
} from '@odf/shared/types';
import { getGVK, referenceForModel } from '@odf/shared/utils';
import {
  HealthState,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { HealthBody } from '@openshift-console/dynamic-plugin-sdk-internal';
import * as _ from 'lodash';
import { useTranslation } from 'react-i18next';
import {
  Gallery,
  GalleryItem,
  pluralize,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { getVendorDashboardLinkFromMetrics } from '../../utils';
import { StorageDashboard, STATUS_QUERIES } from '../queries';
import { getOperatorHealthState } from '../utils';
import StorageSystemPopup from './storage-system-popup';
import '../../../style.scss';

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: 'openshift-storage',
  isList: true,
};

const storageSystemResource: WatchK8sResource = {
  kind: referenceForModel(ODFStorageSystem),
  namespace: 'openshift-storage',
  isList: true,
};

export const StatusCard: React.FC = () => {
  const { t } = useTranslation('plugin__odf-console');
  const [csvData, csvLoaded, csvLoadError] =
    useK8sWatchResource<ClusterServiceVersionKind[]>(operatorResource);
  const [systems, systemsLoaded, systemsLoadError] = useK8sWatchResource<
    StorageSystemKind[]
  >(storageSystemResource);

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
  const ocsHealthStatus = useGetOCSHealth();

  const parsedHealthData =
    !healthError &&
    !healthLoading &&
    systemsLoaded &&
    !systemsLoadError &&
    healthData
      ? healthData?.data?.result?.reduce((acc, curr) => {
          const systemName = curr.metric.storage_system;
          const storageSystem = systems.find(
            (system) => system.metadata.name === systemName
          );
          const { apiGroup } = getGVK(storageSystem.spec.kind);
          const systemData =
            apiGroup === OCSStorageClusterModel.apiGroup
              ? {
                  systemName,
                  rawHealthData: ocsHealthStatus.rawHealthState,
                  healthState: healthStateMap(ocsHealthStatus.rawHealthState),
                  link: getVendorDashboardLinkFromMetrics(
                    curr.metric.system_type,
                    systemName,
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
                    curr.metric.system_type,
                    systemName
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

  return (
    <Card className="odfDashboard-card--height">
      <CardHeader>
        <CardTitle>{t('Status')}</CardTitle>
      </CardHeader>
      <CardBody>
        <HealthBody>
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
                  title={pluralize(healthySystems.length, 'Storage System')}
                  state={HealthState.OK}
                >
                  <StorageSystemPopup systemHealthMap={healthySystems} />
                </HealthItem>
              </GalleryItem>
            )}
            {unHealthySystems.length > 0 && (
              <GalleryItem>
                <HealthItem
                  title={pluralize(unHealthySystems.length, 'Storage System')}
                  state={HealthState.ERROR}
                  maxWidth="35rem"
                >
                  <StorageSystemPopup systemHealthMap={unHealthySystems} />
                </HealthItem>
              </GalleryItem>
            )}
          </Gallery>
        </HealthBody>
      </CardBody>
    </Card>
  );
};
