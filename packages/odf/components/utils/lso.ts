import { LABEL_OPERATOR, LABEL_SELECTOR } from '@odf/core/constants';
import {
  LocalVolumeDiscoveryResultKind,
  DiscoveredDisk,
  DiskMetadata,
  DeviceType,
} from '@odf/core/types';
import { LocalVolumeDiscoveryResult } from '@odf/shared';
import { AVAILABLE } from '@odf/shared/constants';
import { referenceForModel } from '@odf/shared/utils';
import { WatchK8sResource } from '@openshift-console/dynamic-plugin-sdk';
import { WizardNodeState } from '../create-storage-system/reducer';

const isAvailableDisk = (disk: DiscoveredDisk): boolean =>
  disk?.status?.state === AVAILABLE &&
  (disk.type === DeviceType.RawDisk ||
    disk.type === DeviceType.Partition ||
    disk.type === DeviceType.Multipath);

const addNodesOnAvailableDisks = (disks: DiskMetadata[] = [], node: string) =>
  disks.reduce((availableDisks: DiscoveredDisk[], disk: DiscoveredDisk) => {
    if (isAvailableDisk(disk)) {
      disk.node = node;
      return [disk, ...availableDisks];
    }
    return availableDisks;
  }, []);

export const createDiscoveredDiskData = (
  results: LocalVolumeDiscoveryResultKind[]
): DiscoveredDisk[] =>
  results?.reduce((discoveredDisk: DiscoveredDisk[], lvdr) => {
    const lvdrDisks = lvdr?.status?.discoveredDevices;
    const lvdrNode = lvdr?.spec?.nodeName;
    const availableDisks = addNodesOnAvailableDisks(lvdrDisks, lvdrNode) || [];
    return [...availableDisks, ...discoveredDisk];
  }, []) || [];

export const getLvdrResource = (
  nodes: WizardNodeState[] = [],
  ns: string
): WatchK8sResource => {
  return {
    kind: referenceForModel(LocalVolumeDiscoveryResult),
    namespace: ns,
    isList: true,
    selector: {
      matchExpressions: [
        {
          key: LABEL_SELECTOR,
          operator: LABEL_OPERATOR,
          values: nodes.map((node) => node.name),
        },
      ],
    },
  };
};
