import * as React from 'react';
import {
  K8sResourceCommon,
  WatchK8sResource,
} from 'badhikar-dynamic-plugin-sdk';
import { useK8sWatchResource } from 'badhikar-dynamic-plugin-sdk/api';
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
  DashboardCardTitle,
  HealthBody,
  HealthItem,
} from 'badhikar-dynamic-plugin-sdk/internalAPI';
import {
  Alert,
  PrometheusLabels,
} from 'badhikar-dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash';
import { getCephHealthState, getOperatorHealthState } from '../utils';
import { Gallery, GalleryItem } from '@patternfly/react-core';

export const labelsToParams = (labels: PrometheusLabels) =>
  _.map(
    labels,
    (v, k) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
  ).join('&');

export const filterCephAlerts = (alerts: Alert[]): Alert[] => {
  const rookRegex = /.*rook.*/;
  return alerts?.filter(
    (alert) =>
      alert?.annotations?.storage_type === 'ceph' ||
      Object.values(alert?.labels)?.some((item) => rookRegex.test(item))
  );
};

type K8sListKind = K8sResourceCommon & {
  items: K8sResourceCommon & {
    status?: any;
  };
};

const operatorResource: WatchK8sResource = {
  kind: 'operators.coreos.com~v1alpha1~ClusterServiceVersion',
  namespace: 'openshift-storage',
  isList: true,
};

const cephClusterResource: WatchK8sResource = {
  kind: 'ceph.rook.io~v1~CephCluster',
  namespace: 'openshift-storage',
  isList: true,
};

export const StatusCard: React.FC = () => {
  const [cephData, cephLoaded, cephLoadError] =
    useK8sWatchResource(cephClusterResource);

  const [csvData, csvLoaded, csvLoadError] =
    useK8sWatchResource<K8sListKind>(operatorResource);

  const operatorStatus = csvData?.[0]?.status?.phase;

  const cephHealthState = getCephHealthState({
    ceph: { data: cephData, loaded: cephLoaded, loadError: cephLoadError },
  });

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
            <GalleryItem>
              <HealthItem
                title="Storage System"
                state={cephHealthState.state}
                details={cephHealthState.message}
              />
            </GalleryItem>
          </Gallery>
        </HealthBody>
      </DashboardCardBody>
    </DashboardCard>
  );
};
