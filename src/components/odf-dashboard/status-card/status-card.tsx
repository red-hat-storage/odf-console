import * as React from 'react';
import {
  HealthState,
  K8sResourceCommon,
  WatchK8sResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  HealthBody,
  HealthItem,
  usePrometheusPoll,
} from '@openshift-console/dynamic-plugin-sdk/internalAPI';
import * as _ from 'lodash';
import { Gallery, GalleryItem, pluralize } from '@patternfly/react-core';
import { getVendorDashboardLinkFromMetrics } from '../../utils';
import { STATUS_QUERIES, StorageDashboard } from '../queries';
import { getOperatorHealthState } from '../utils';
import StorageSystemPopup from './storage-system-popup';

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: 'openshift-storage',
  isList: true,
};

const healthStateMap = (state: string) => {
  switch (state) {
    case '0':
      return HealthState.OK;
    case '1':
      return HealthState.WARNING;
    case '2':
      return HealthState.ERROR;
    default:
      return HealthState.LOADING;
  }
};

export const StatusCard: React.FC = () => {
  const [csvData, csvLoaded, csvLoadError] =
    useK8sWatchResource<K8sResourceCommon[]>(operatorResource);

  const [healthData, healthError, healthLoading] = usePrometheusPoll({
    query: STATUS_QUERIES[StorageDashboard.HEALTH],
    endpoint: 'api/v1/query' as any,
  });

  console.log(healthData, healthError, healthLoading);

  const operatorStatus: string = (
    csvData?.find((csv) => csv.metadata.name.includes('odf-operator')) as any
  )?.status?.phase;

  const parsedHealthData =
    !healthError && !healthLoading
      ? healthData.data.result.reduce((acc, curr) => {
          const systemName = curr.metric.storage_system;
          const systemData = {
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
    <DashboardCard>
      <DashboardCardHeader>
        <DashboardCardTitle>Status</DashboardCardTitle>
      </DashboardCardHeader>
      <DashboardCardBody>
        <HealthBody>
          <Gallery className="co-overview-status__health" hasGutter>
            <GalleryItem>
              <HealthItem
                title="OpenShift Data Foundation"
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
                >
                  <StorageSystemPopup systemHealthMap={unHealthySystems} />
                </HealthItem>
              </GalleryItem>
            )}
          </Gallery>
        </HealthBody>
      </DashboardCardBody>
    </DashboardCard>
  );
};
