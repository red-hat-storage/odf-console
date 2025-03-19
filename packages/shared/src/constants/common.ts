import {
  InfraProviders,
  StorageSizeUnit,
  StorageSizeUnitName,
} from '@odf/shared/types';

export const DASH = '-';
export const AVAILABLE = 'Available';
export const DEFAULT_STORAGE_NAMESPACE = 'openshift-storage'; // This hardcoded namespace is only for specific cases, do not use it otherwise.
export const ODF_OPERATOR = 'odf-operator';
export const OCS_OPERATOR = 'ocs-operator';
export const ONE_SECOND = 1000;
export const ONE_MINUTE = 60 * ONE_SECOND;
export const ONE_HOUR = 60 * ONE_MINUTE;
export const ALL_NAMESPACES = 'all-namespaces';
export const DEFAULT_NS = 'default';
export const RACK_LABEL = 'topology.rook.io/rack';
export const NOOBA_EXTERNAL_PG_SECRET_NAME = 'noobaa-external-pg';
export const NOOBAA_EXTERNAL_PG_TLS_SECRET_NAME = 'noobaa-external-pg-tls';
export const PLUGIN_VERSION =
  typeof process === 'undefined' ? undefined : process?.env?.PLUGIN_VERSION;

// Proxy.

export const CONSOLE_PROXY_ROOT_PATH = '/api/proxy/plugin';
export const ODF_PROXY_ROOT_PATH = `${CONSOLE_PROXY_ROOT_PATH}/odf-console`;
export const MCO_PROXY_ROOT_PATH = `${CONSOLE_PROXY_ROOT_PATH}/odf-multicluster-console`;

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
  InfraProviders.VSphere,
];
export const STORAGE_SIZE_UNIT_NAME_MAP = Object.freeze({
  [StorageSizeUnit.B]: StorageSizeUnitName.B,
  [StorageSizeUnit.Ki]: StorageSizeUnitName.KiB,
  [StorageSizeUnit.Mi]: StorageSizeUnitName.MiB,
  [StorageSizeUnit.Gi]: StorageSizeUnitName.GiB,
  [StorageSizeUnit.Ti]: StorageSizeUnitName.TiB,
});
