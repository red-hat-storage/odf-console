import { CONTROL_PLANE } from '@odf/core/constants/common';
import { ARBITER_ZONE, NodeType } from '@odf/core/constants/scale';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { getName } from '@odf/shared';

const LOCAL_DISK_NAME_PREFIX = 'localdisk-';
const MAX_LOCAL_DISK_NAME_LENGTH = 253;
const MAX_DEVICE_KEY_TOKEN_LENGTH =
  MAX_LOCAL_DISK_NAME_LENGTH - LOCAL_DISK_NAME_PREFIX.length;
const DEVICE_KEY_DIGEST_LENGTH = 8;

/** RFC 1123 DNS subdomain pattern used by Kubernetes metadata.name. */
const DNS1123_SUBDOMAIN_REGEXP =
  /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

/**
 * Stable key for a discovered device.
 * Prefer WWN (SAN/SCSI), then deviceID (DASD UID on IBM Z), then path.
 * Mirrors devicefinder uniqueDevices deduplication order.
 */
export const getDiscoveredDeviceKey = (
  device: Pick<DiscoveredDevice, 'WWN' | 'deviceID' | 'path'>
): string => device.WWN || device.deviceID || device.path || '';

const isDNS1123Subdomain = (value: string): boolean =>
  value.length > 0 &&
  value.length <= MAX_DEVICE_KEY_TOKEN_LENGTH &&
  DNS1123_SUBDOMAIN_REGEXP.test(value);

/**
 * Stable hex digest used to disambiguate sanitized LocalDisk names.
 * Uses a multiplicative hash so distinct keys keep distinct tokens after
 * non-injective DNS normalization / truncation.
 */
export const digestDeviceKey = (value: string): string => {
  // Keep the running value in unsigned 32-bit space via Math.imul so long
  // keys remain distinguishable without ESLint-restricted bitwise operators.
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash, 16777619) + value.charCodeAt(i);
    hash %= 4294967296;
    if (hash < 0) {
      hash += 4294967296;
    }
  }
  return hash
    .toString(16)
    .padStart(DEVICE_KEY_DIGEST_LENGTH, '0')
    .slice(0, DEVICE_KEY_DIGEST_LENGTH);
};

const normalizeDeviceKeyToken = (deviceKey: string): string =>
  deviceKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Deterministic Kubernetes DNS-1123 token for a device key.
 * Already-valid keys (WWN, DASD UID) are unchanged so existing LocalDisk
 * names remain compatible. Path / by-id keys are sanitized and get a
 * digest suffix so distinct keys that normalize alike stay unique.
 */
export const toLocalDiskNameToken = (deviceKey: string): string => {
  if (isDNS1123Subdomain(deviceKey)) {
    return deviceKey;
  }

  const digestSuffix = `-${digestDeviceKey(deviceKey)}`;
  const maxBaseLength = MAX_DEVICE_KEY_TOKEN_LENGTH - digestSuffix.length;

  let token = normalizeDeviceKeyToken(deviceKey);
  if (token.length > maxBaseLength) {
    token = token.slice(0, maxBaseLength).replace(/-+$/g, '');
  }

  return `${token || 'unknown'}${digestSuffix}`;
};

export const getLocalDiskNameFromDeviceKey = (deviceKey: string): string =>
  `${LOCAL_DISK_NAME_PREFIX}${toLocalDiskNameToken(deviceKey)}`;

export const filterUsedDiscoveredDevices = (
  discoveredDevices: DiscoveredDevice[],
  localDisks: LocalDiskKind[]
): DiscoveredDevice[] => {
  const usedNames = new Set(localDisks.map((disk) => getName(disk)));
  return discoveredDevices.filter((device) => {
    const deviceKey = getDiscoveredDeviceKey(device);
    if (!deviceKey) {
      return true;
    }
    return !usedNames.has(getLocalDiskNameFromDeviceKey(deviceKey));
  });
};

/** Default local cluster role from OCP node role and zone. */
export const getDefaultLocalClusterRole = (
  roles: string[],
  zone: string,
  enableStretchCluster = false
): NodeType => {
  if (
    enableStretchCluster &&
    zone === ARBITER_ZONE &&
    roles.includes(CONTROL_PLANE)
  ) {
    return NodeType.ARBITER;
  }
  if (roles.includes(CONTROL_PLANE)) {
    return NodeType.CLUSTER;
  }
  return NodeType.DISK;
};
