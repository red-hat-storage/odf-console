import * as React from 'react';
import { deviceTypeDropdownItems } from '@odf/core/constants';
import {
  LocalVolumeDiscoveryResultKind,
  DiscoveredDisk,
  DiskMetadata,
  DISK_TYPES,
} from '@odf/core/types';
import { convertToBaseValue } from '@odf/shared/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { getLvdrResource, createDiscoveredDiskData } from '../../../utils';
import { WizardState } from '../../reducer';

type UseLSODiscoveredDisks = (
  state: WizardState['createLocalVolumeSet'],
  selectedNodes: WizardState['nodes'],
  namespace: string,
  allNodes: WizardState['nodes']
) => {
  filteredDisksOnSelectedNodes: DiscoveredDisk[];
  allDiscoveredDisks: DiscoveredDisk[];
  disksLoaded: boolean;
  disksError: unknown;
};

const isValidSize = (disk: DiscoveredDisk, minSize: number, maxSize: number) =>
  Number(disk.size) >= minSize &&
  (maxSize ? Number(disk.size) <= maxSize : true);

const isValidDiskProperty = (
  disk: DiscoveredDisk,
  property: DiskMetadata['property']
) => (property ? property === disk.property : true);

const isValidDeviceType = (disk: DiscoveredDisk, types: string[]) =>
  types.includes(deviceTypeDropdownItems[disk.type.toUpperCase()]);

export const useLSODiscoveredDisks: UseLSODiscoveredDisks = (
  state,
  selectedNodes,
  namespace,
  allNodes
) => {
  const [lvdResults, lvdResultsLoaded, lvdResultsError] = useK8sWatchResource<
    LocalVolumeDiscoveryResultKind[]
  >(getLvdrResource(allNodes, namespace));

  const minSize: number = state.minDiskSize
    ? Number(convertToBaseValue(`${state.minDiskSize} ${state.diskSizeUnit}`))
    : 0;
  const maxSize: number = state.maxDiskSize
    ? Number(convertToBaseValue(`${state.maxDiskSize} ${state.diskSizeUnit}`))
    : undefined;

  // All "Available" disks discovered by LocalVolumeDiscoveryResults
  const allDiscoveredDisks: DiscoveredDisk[] = React.useMemo(
    () => createDiscoveredDiskData(lvdResults),
    [lvdResults]
  );

  // Filtered disks as per LocalVolumeSet configurations or wizard's "Advanced" filtering
  const filteredDisks: DiscoveredDisk[] = React.useMemo(
    () =>
      allDiscoveredDisks.length
        ? allDiscoveredDisks.filter(
            (disk: DiscoveredDisk) =>
              state.isValidDiskSize &&
              isValidSize(disk, minSize, maxSize) &&
              isValidDiskProperty(disk, DISK_TYPES[state.diskType]?.property) &&
              isValidDeviceType(disk, state.deviceType)
          )
        : [],
    [
      allDiscoveredDisks,
      maxSize,
      minSize,
      state.deviceType,
      state.diskType,
      state.isValidDiskSize,
    ]
  );

  // Filtered disks on the specific selected nodes
  const filteredDisksOnSelectedNodes = React.useMemo(() => {
    const selectedNodesSet = selectedNodes?.reduce(
      (data, node) => data.add(node.name),
      new Set()
    );
    return filteredDisks.filter((disk: DiscoveredDisk) =>
      selectedNodesSet.has(disk.node)
    );
  }, [filteredDisks, selectedNodes]);

  return {
    filteredDisksOnSelectedNodes,
    allDiscoveredDisks,
    disksLoaded: lvdResultsLoaded && allNodes?.length === lvdResults?.length,
    disksError: lvdResultsError,
  };
};
