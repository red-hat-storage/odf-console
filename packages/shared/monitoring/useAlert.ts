import { usePrometheusPoll } from '@openshift-console/dynamic-plugin-sdk-internal';

const useAlerts = () => {
  const [alerts, error, loading] = usePrometheusPoll({
    endpoint: 'api/v1/rules' as any,
    query: 'api/v1/rules',
  });
  return [alerts, !loading, error];
};

export default useAlerts;
