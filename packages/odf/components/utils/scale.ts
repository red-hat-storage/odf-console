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
