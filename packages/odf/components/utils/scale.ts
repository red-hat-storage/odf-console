import { CONTROL_PLANE } from '@odf/core/constants/common';
import { ARBITER_ZONE, NodeType } from '@odf/core/constants/scale';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { getName } from '@odf/shared';
import { Taint, Toleration } from '@odf/shared/types';
import { WizardNodeState } from '../create-storage-system/reducer';

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
  if (enableStretchCluster && zone === ARBITER_ZONE) {
    return NodeType.ARBITER;
  }
  if (roles.includes(CONTROL_PLANE)) {
    return NodeType.CLUSTER;
  }
  return NodeType.DISK;
};

/**
 * Effective local-cluster role for an already-selected node, derived live.
 *
 * The Arbiter role is never stored on the node (see {@link createWizardNodeState}'s
 * options): it is purely a function of the live "Stretch cluster" toggle plus the
 * node being in the arbiter zone. Computing it here — rather than snapshotting it
 * at selection time — keeps discovery and node-role labeling consistent with the
 * table display no matter when the stretch toggle is flipped. For every other
 * case the node's stored base role (Cluster/Disk, including any manual override)
 * is returned unchanged.
 */
export const getEffectiveLocalClusterRole = (
  node: WizardNodeState,
  enableStretchCluster?: boolean
): NodeType =>
  enableStretchCluster && node.zone === ARBITER_ZONE
    ? NodeType.ARBITER
    : (node.localClusterRole ??
      getDefaultLocalClusterRole(node.roles ?? [], node.zone ?? ''));

/**
 * Stable de-duplication identity for a taint/toleration
 * (key + operator + value + effect + tolerationSeconds).
 *
 * All fields are optional here so the helper accepts both a Taint (which has no
 * `operator`/`tolerationSeconds`) and a Toleration. Including `operator` and
 * `tolerationSeconds` keeps genuinely distinct tolerations apart — e.g. an
 * `Equal` toleration with an empty value is NOT the same as an `Exists`
 * toleration, and two tolerations differing only by `tolerationSeconds` are
 * distinct. For plain taints the extra fields are absent and collapse to the
 * previous key + value + effect behavior.
 */
export const getTaintOrTolerationIdentity = (entry: {
  key?: Taint['key'];
  value?: Taint['value'];
  effect?: Taint['effect'];
  operator?: Toleration['operator'];
  tolerationSeconds?: Toleration['tolerationSeconds'];
}): string =>
  `${entry.key ?? ''}|${entry.operator ?? ''}|${entry.value ?? ''}|${entry.effect ?? ''}|${entry.tolerationSeconds ?? ''}`;

/**
 * Builds the de-duplicated union of tolerations required to schedule pods onto
 * the taints carried by the given nodes.
 *
 * Every distinct taint (by key + value + effect) across all nodes yields one
 * toleration so that operator/daemon pods can schedule even when the selected
 * nodes carry non-overlapping taints (the "all workers tainted" scenario).
 *
 * - A taint with a value -> `operator: Equal` (matches that exact value).
 * - A taint without a value -> `operator: Exists` (matches any value for the key).
 * - `tolerationSeconds` is intentionally left unset (tolerate forever).
 */
export const getTolerationsFromNodes = (
  nodes: WizardNodeState[] = []
): Toleration[] => {
  // Keyed by taint identity so duplicates collapse automatically (last write
  // wins, but the value is identical for a given key). Insertion order of the
  // first occurrence is preserved.
  const byTaint = new Map<string, Toleration>();

  nodes.forEach((node) => {
    (node.taints ?? []).forEach((taint) => {
      byTaint.set(
        getTaintOrTolerationIdentity(taint),
        taint.value
          ? {
              key: taint.key,
              operator: 'Equal',
              value: taint.value,
              effect: taint.effect,
            }
          : {
              key: taint.key,
              operator: 'Exists',
              effect: taint.effect,
            }
      );
    });
  });

  return [...byTaint.values()];
};

/**
 * Merges existing tolerations with newly-derived ones, de-duplicating on the
 * full {@link getTaintOrTolerationIdentity} (key + operator + value + effect +
 * tolerationSeconds).
 * Existing tolerations are preserved (and win on collision); only genuinely new
 * tolerations are appended. Used when expanding a local cluster so a newly-added
 * tainted node's toleration is added to the Cluster without dropping the ones
 * written at create time.
 */
export const mergeTolerations = (
  existing: Toleration[] = [],
  incoming: Toleration[] = []
): Toleration[] => {
  const byIdentity = new Map<string, Toleration>();
  [...existing, ...incoming].forEach((toleration) => {
    const identity = getTaintOrTolerationIdentity(toleration);
    if (!byIdentity.has(identity)) {
      byIdentity.set(identity, toleration);
    }
  });
  return [...byIdentity.values()];
};
