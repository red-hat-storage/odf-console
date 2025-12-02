import { ODF_PROXY_ROOT_PATH } from '@odf/shared/constants/common';

const ROSA_PROXY_ENDPOINT = `${ODF_PROXY_ROOT_PATH}/rosa-prometheus`;

export const usePrometheusBasePath = () =>
  window.SERVER_FLAGS.branding === 'rosa' ? ROSA_PROXY_ENDPOINT : '';

const normalizeBasePath = (basePath: string = ''): string =>
  basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

export const useAlertManagerBasePath = (): string =>
  normalizeBasePath(window.SERVER_FLAGS?.alertManagerBaseURL || '');
