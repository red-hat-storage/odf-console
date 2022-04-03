import {
  useCustomPrometheusPoll,
  usePrometheusBasePath,
} from '@odf/shared/hooks/custom-prometheus-poll';

const useAlerts = (basePath = '') => {
  const defaultBasePath = usePrometheusBasePath();

  const [alerts, error, loading] = useCustomPrometheusPoll({
    endpoint: 'api/v1/rules' as any,
    query: 'api/v1/rules',
    basePath: basePath || defaultBasePath,
  });
  return [alerts, !loading, error];
};

export default useAlerts;
