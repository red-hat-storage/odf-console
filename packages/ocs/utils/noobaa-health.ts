import { getGaugeValue } from '@odf/shared/utils';
import {
  HealthState,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  PrometheusHealthHandler,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk/lib/extensions/dashboard-types';
import { TFunction } from 'i18next';

const parseNoobaaStatus = (status: string, t: TFunction): SubsystemHealth => {
  switch (status) {
    case '0':
      return { state: HealthState.OK };
    case '1':
      return {
        state: HealthState.ERROR,
        message: t('plugin__odf-console~All resources are unhealthy'),
      };
    case '2':
      return {
        state: HealthState.WARNING,
        message: t('plugin__odf-console~Object Bucket has an issue'),
      };
    case '3':
      return {
        state: HealthState.ERROR,
        message: t('plugin__odf-console~Many buckets have issues'),
      };
    case '4':
      return {
        state: HealthState.WARNING,
        message: t('plugin__odf-console~Some buckets have issues'),
      };
    default:
      return { state: HealthState.UNKNOWN };
  }
};

export const getNooBaaState: PrometheusHealthHandler = (
  responses,
  t,
  noobaa
) => {
  const { response, error } = responses[0];
  const noobaaLoaded = noobaa?.loaded;
  const noobaaLoadError = noobaa?.loadError;
  const noobaaData = noobaa?.data as K8sResourceCommon[];
  const statusIndex: string = getGaugeValue(response);

  if (error || noobaaLoadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!noobaaLoaded || !response) {
    return { state: HealthState.LOADING };
  }
  if (!statusIndex || !noobaaData?.length) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  return parseNoobaaStatus(statusIndex, t);
};
