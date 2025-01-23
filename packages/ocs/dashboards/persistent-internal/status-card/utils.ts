import { PrometheusHealthHandler } from '@odf/shared/types';
import { getResiliencyProgress } from '@odf/shared/utils';
import { HealthState } from '@openshift-console/dynamic-plugin-sdk';

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
