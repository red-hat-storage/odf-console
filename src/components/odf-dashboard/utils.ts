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

const CephHealthStatus = (status: string): SubsystemHealth => {
  switch (status) {
    case 'HEALTH_OK':
      return {
        state: HealthState.OK,
      };
    case 'HEALTH_WARN':
      return {
        state: HealthState.WARNING,
        message: 'Warning',
      };
    case 'HEALTH_ERR':
      return {
        state: HealthState.ERROR,
        message: 'Error',
      };
    default:
      return { state: HealthState.UNKNOWN };
  }
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

export const getCephHealthState = ({ ceph }) => {
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
  return CephHealthStatus(status);
};

export const getDataResiliencyState = (responses) => {
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
    return {
      state: HealthState.PROGRESS,
      message: 'Progressing',
    };
  }
  return { state: HealthState.OK };
};

export const getGaugeValue = (response) =>
  response?.data?.result?.[0]?.value?.[1];

export const getResiliencyProgress = (results): number => {
  /**
   * Possible values for progress:
   *   - A float value of String type
   *   - 'NaN'
   *   - undefined
   */
  const progress: string = getGaugeValue(results);
  return parseFloat(progress);
};
