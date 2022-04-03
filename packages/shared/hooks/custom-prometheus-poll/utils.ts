import { useFlag } from '@openshift-console/dynamic-plugin-sdk';

const ODF_MANAGED = 'ODF_MANAGED';
const ODF_MANAGED_PROXY_ENDPOINT =
  '/api/proxy/plugin/odf-console/odf-managed-service-prom';

export const usePrometheusBasePath = () =>
  useFlag(ODF_MANAGED) ? ODF_MANAGED_PROXY_ENDPOINT : '';
