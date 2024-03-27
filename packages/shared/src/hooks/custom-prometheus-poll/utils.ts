const ROSA_PROXY_ENDPOINT = '/api/proxy/plugin/odf-console/rosa-prometheus';

export const usePrometheusBasePath = () =>
  window.SERVER_FLAGS.branding === 'rosa' ? ROSA_PROXY_ENDPOINT : '';
