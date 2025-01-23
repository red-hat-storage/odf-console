import {
  CONSOLE_PROXY_ROOT_PATH,
  MCO_PROXY_ROOT_PATH,
} from '@odf/shared/constants/common';

// ACM thanos proxy endpoint
export const ACM_ENDPOINT = `${MCO_PROXY_ROOT_PATH}/acm-thanos-querier`;
// ACM thanos dev endpoint
export const DEV_ACM_ENDPOINT = '/acm-thanos-querier';
// ACM application details page endpoint
export const applicationDetails =
  '/multicloud/applications/details/:namespace/:name';
// ACM search api proxy endpoint
export const ACM_SEARCH_PROXY_ENDPOINT = `${CONSOLE_PROXY_ROOT_PATH}/acm/console/multicloud/proxy/search`;
// MCO DR navigation item base route
export const DR_BASE_ROUTE = '/multicloud/data-services/disaster-recovery';
