import {
  InfraProviders,
  StorageSizeUnit,
  StorageSizeUnitName,
} from '@odf/shared/types';

export const DASH = '-';
export const WILDCARD = '*';
export const AVAILABLE = 'Available';
export const DEFAULT_STORAGE_NAMESPACE = 'openshift-storage'; // This hardcoded namespace is only for specific cases, do not use it otherwise.
export const ODF_OPERATOR = 'odf-operator';
export const OCS_OPERATOR = 'ocs-operator';
export const ROOK_CEPH_OPERATOR = 'rook-ceph-operator';
export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const MINUTES_IN_DAY = 24 * 60;
export const TWENTY_FOUR_HOURS = 24 * ONE_HOUR;
export const SAMPLE_STEP_SECONDS = 60;
export const ALERTMANAGER_SILENCES_PATH = 'api/v2/silences';
export const getAlertManagerSilenceEndpoint = (
  basePath: string,
  silenceId: string
) => `${basePath}/api/v2/silence/${silenceId}`;
export const ALL_NAMESPACES = 'all-namespaces';
export const DEFAULT_NS = 'default';
export const RACK_LABEL = 'topology.rook.io/rack';
export const NOOBA_EXTERNAL_PG_SECRET_NAME = 'noobaa-external-pg';
export const NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME = 'noobaa-external-pg-tls';
export const PLUGIN_I18N_NS =
  typeof PLUGIN_BUILD_I8N_NS === 'undefined' ? '' : PLUGIN_BUILD_I8N_NS;
export const PLUGIN_NAME =
  typeof PLUGIN_BUILD_NAME === 'undefined' ? '' : PLUGIN_BUILD_NAME;
export const PLUGIN_VERSION =
  typeof PLUGIN_BUILD_VERSION === 'undefined' ? '' : PLUGIN_BUILD_VERSION;
export const PLUGIN_OPENSHIFT_CI =
  typeof OPENSHIFT_CI === 'undefined' ? '' : OPENSHIFT_CI;

// Plugins' build names as set in package.json file.
export const CLIENT_PLUGIN_BUILD_NAME = 'client';
export const MCO_PLUGIN_BUILD_NAME = 'mco';
export const ODF_PLUGIN_BUILD_NAME = 'odf';

// Proxy.

export const CONSOLE_PROXY_ROOT_PATH = '/api/proxy/plugin';
export const ODF_PROXY_ROOT_PATH = `${CONSOLE_PROXY_ROOT_PATH}/odf-console`;
export const MCO_PROXY_ROOT_PATH = `${CONSOLE_PROXY_ROOT_PATH}/odf-multicluster-console`;
export const UX_BACKEND_PROXY_ROOT_PATH = `${ODF_PROXY_ROOT_PATH}/provider-proxy`;

// Infrastructure.

export const CAPACITY_AUTOSCALING_MAX_LIMIT_IN_TIB = 768;
export const CAPACITY_AUTOSCALING_PROVIDERS = [
  InfraProviders.AWS,
  InfraProviders.Azure,
  InfraProviders.GCP,
  InfraProviders.IBMCloud,
  InfraProviders.VSphere,
];
export const CAPACITY_OSD_MAX_SIZE_IN_TIB = 8;
export const DEFAULT_DEVICECLASS = 'ssd';
export const DEFAULT_INFRASTRUCTURE = 'cluster';
export const RHCS_SUPPORTED_INFRA = [
  InfraProviders.BareMetal,
  InfraProviders.IBMCloud,
  InfraProviders.None,
  InfraProviders.OpenStack,
  InfraProviders.OVirt,
  InfraProviders.KubeVirt,
  InfraProviders.VSphere,
];
export const STORAGE_SIZE_UNIT_NAME_MAP = Object.freeze({
  [StorageSizeUnit.B]: StorageSizeUnitName.B,
  [StorageSizeUnit.Ki]: StorageSizeUnitName.KiB,
  [StorageSizeUnit.Mi]: StorageSizeUnitName.MiB,
  [StorageSizeUnit.Gi]: StorageSizeUnitName.GiB,
  [StorageSizeUnit.Ti]: StorageSizeUnitName.TiB,
});
export const TIB_CONVERSION_DIVISOR = {
  [StorageSizeUnit.Gi]: 1024,
  [StorageSizeUnit.Ti]: 1,
};

export const BLOCK = 'Block';
export const FILESYSTEM = 'Filesystem';

export const OPENSHIFT_USER_WORKLOAD_MONITORING_NAMESPACE =
  'openshift-user-workload-monitoring';
