import { useFlag } from '@openshift-console/dynamic-plugin-sdk';

const ROSA_FLAG = 'ROSA';
// ToDo: Add ROSA proxy endpoint here
const ROSA_PROXY_ENDPOINT = '/api/proxy/plugin/odf-console/rosa';

export const usePrometheusBasePath = () =>
  useFlag(ROSA_FLAG) ? ROSA_PROXY_ENDPOINT : '';
