import { PodPhase, PodKind } from '@odf/shared/types';
import {
  HealthState,
  SubsystemHealth,
} from '@openshift-console/dynamic-plugin-sdk';

export const getPodStatus = (obj: PodKind): PodPhase =>
  (obj?.status?.phase as PodPhase) || PodPhase.Unknown;

export const getPodHealthState = (
  podPhase: PodPhase,
  loading: boolean,
  loadError: any
): SubsystemHealth => {
  if (loading) {
    return { state: HealthState.LOADING };
  }
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (!!podPhase && [PodPhase.Running, PodPhase.Succeeded].includes(podPhase)) {
    return { state: HealthState.OK };
  }
  if (!!podPhase && [PodPhase.Pending, PodPhase.Failed].includes(podPhase)) {
    return { state: HealthState.ERROR };
  }
  return { state: HealthState.UNKNOWN };
};
