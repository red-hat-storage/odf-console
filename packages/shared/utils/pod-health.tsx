import {
  HealthState,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk';

// containers have not been started or have terminated
const POD_PHASE_DEGRADED = ['Pending', 'Failed'];
// containers have been started
const POD_PHASE_HEALTHY = 'Running';
// containers have voluntarily terminated
const POD_PHASE_SUCCEEDED = 'Succeeded';

export const getRunningPodHealthState = (
  podPhase: string,
  loading: boolean,
  loadError: any
): SubsystemHealth => {
  if (loading) {
    return { state: HealthState.LOADING };
  }
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!!podPhase && podPhase === POD_PHASE_HEALTHY) {
    return { state: HealthState.OK };
  }
  if (
    !!podPhase &&
    [...POD_PHASE_DEGRADED, POD_PHASE_SUCCEEDED].includes(podPhase)
  ) {
    return { state: HealthState.ERROR };
  }
  return { state: HealthState.UNKNOWN };
};
