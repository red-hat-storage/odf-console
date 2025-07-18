import { odfDocBasePath } from '@odf/shared/constants';
import { STATE_PRIORITY } from '@odf/shared/dashboards/status-card/states';
import { DOC_VERSION } from '@odf/shared/hooks';
import {
  CephClusterKind,
  CephHealthCheckType,
  K8sResourceKind,
  PrometheusHealthHandler,
  ResourceHealthHandler,
} from '@odf/shared/types';
import { getResiliencyProgress } from '@odf/shared/utils';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import { SubsystemHealth } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import * as _ from 'lodash-es';
import { TFunction } from 'react-i18next';

export type WatchCephResource = {
  ceph: K8sResourceKind;
};

export type WatchCephResources = {
  ceph: K8sResourceKind[];
};

export const getDataResiliencyState: PrometheusHealthHandler = (
  responses,
  t
) => {
  const progress: number = getResiliencyProgress(responses[0].response);
  if (responses[0].error) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!responses[0].response) {
    return { state: HealthState.LOADING };
  }
  if (Number.isNaN(progress)) {
    return { state: HealthState.UNKNOWN };
  }
  if (progress < 1) {
    return { state: HealthState.PROGRESS, message: t('Progressing') };
  }
  return { state: HealthState.OK };
};

export const getCephHealthChecks = (
  cephCluster: CephClusterKind
): CephHealthCheckType[] => {
  const pattern = /[A-Z]+_*|error/g;
  const healthChecks: CephHealthCheckType[] = [];
  const cephDetails = cephCluster?.status?.ceph?.details;
  for (const key in cephDetails) {
    if (pattern.test(key)) {
      const healthCheckObject: CephHealthCheckType = {
        id: key,
        details: cephDetails[key].message,
        ...(!!DOC_VERSION
          ? {
              troubleshootLink:
                whitelistedHealthChecksRef(DOC_VERSION)[key] ?? null,
            }
          : {}),
      };
      healthChecks.push(healthCheckObject);
    }
  }
  return healthChecks;
};

const parseCephHealthStatus = (
  status: string,
  t: TFunction
): SubsystemHealth => {
  switch (status) {
    case 'HEALTH_OK':
      return {
        state: HealthState.OK,
      };
    case 'HEALTH_WARN':
      return {
        state: HealthState.WARNING,
        message: t('plugin__odf-console~Warning'),
      };
    case 'HEALTH_ERR':
      return {
        state: HealthState.ERROR,
        message: t('plugin__odf-console~Error'),
      };
    default:
      return { state: HealthState.UNKNOWN };
  }
};

export const getCephHealthState: ResourceHealthHandler<WatchCephResource> = (
  { ceph },
  t
) => {
  const { data, loaded, loadError } = ceph;
  const status = data?.status?.ceph?.health;

  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!loaded) {
    return { state: HealthState.LOADING };
  }
  if (_.isEmpty(data)) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  return parseCephHealthStatus(status, t);
};

export const getCephsHealthState: ResourceHealthHandler<WatchCephResources> = (
  { ceph },
  t
) => {
  const { data, loaded, loadError } = ceph;
  const cephHealthStates = data?.map((cephCluster: K8sResourceKind) =>
    getCephHealthState({ ceph: { data: cephCluster, loaded, loadError } }, t)
  );

  let worstCephHealthState: SubsystemHealth;
  STATE_PRIORITY.some((state) => {
    worstCephHealthState = cephHealthStates?.find(
      (cephHealthState) => cephHealthState.state === state
    );
    return !!worstCephHealthState ? true : false;
  });

  return worstCephHealthState || { state: HealthState.UNKNOWN };
};

export enum Phase {
  CONNECTED = 'Connected',
  PROGRESSING = 'Progressing',
  FAILURE = 'Failure',
  READY = 'Ready',
}

export const getRGWHealthState = (cr: K8sResourceKind): SubsystemHealth => {
  const health = cr?.status?.phase;
  if (!health) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  switch (health) {
    case Phase.CONNECTED:
      return { state: HealthState.OK };
    // Applicable only for OCS 4.5
    case Phase.READY:
      return { state: HealthState.OK };
    case Phase.PROGRESSING:
      return { state: HealthState.PROGRESS };
    case Phase.FAILURE:
      return { state: HealthState.ERROR };
    default:
      return { state: HealthState.UNKNOWN };
  }
};

export const whitelistedHealthChecksRef = (odfDocVersion: string) => ({
  MON_DISK_LOW: `${odfDocBasePath(
    odfDocVersion
  )}/troubleshooting_openshift_data_foundation#resolving-cluster-health-issues_rhodf`,
});
