import { CONTROL_PLANE } from '@odf/core/constants/common';
import { ARBITER_ZONE, NodeType } from '@odf/core/constants/scale';
import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { getName } from '@odf/shared';

export const filterUsedDiscoveredDevices = (
  discoveredDevices: DiscoveredDevice[],
  localDisks: LocalDiskKind[]
): DiscoveredDevice[] => {
  const usedDevices = localDisks.map((disk) => getName(disk).split('-')[1]);
  return discoveredDevices.filter(
    (device) => !usedDevices.includes(device.WWN)
  );
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
