import { K8sResourceKind } from '@odf/shared/types';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';
import {
  ResourceHealthHandler,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { TFunction } from 'i18next';

export type WatchCephResource = {
  ceph: K8sResourceKind[];
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
  const status = data?.[0]?.status?.ceph?.health;

  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!loaded) {
    return { state: HealthState.LOADING };
  }
  if (data.length === 0) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  return parseCephHealthStatus(status, t);
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
