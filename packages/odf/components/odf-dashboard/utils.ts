enum HealthState {
  OK = 'OK',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  LOADING = 'LOADING',
  UNKNOWN = 'UNKNOWN',
  UPDATING = 'UPDATING',
  PROGRESS = 'PROGRESS',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
}

type SubsystemHealth = {
  message?: string;
  state: HealthState;
};

export const getOperatorHealthState = (
  state: string,
  loading,
  loadError
): SubsystemHealth => {
  if (loading) {
    return { state: HealthState.LOADING };
  }
  if (loadError) {
    return { state: HealthState.NOT_AVAILABLE };
  }
  if (state === 'Succeeded') {
    return { state: HealthState.OK };
  }
  return { state: HealthState.ERROR };
};
