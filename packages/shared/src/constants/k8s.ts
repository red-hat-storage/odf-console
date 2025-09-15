export const enum PVCStatus {
  BOUND = 'Bound',
  AVAILABLE = 'Available',
}

export enum ReclaimPolicy {
  Retain = 'Retain',
  Delete = 'Delete',
}

export enum VolumeBindingMode {
  Immediate = 'Immediate',
  WaitForFirstConsumer = 'WaitForFirstConsumer',
}

export enum PVCVolumeMode {
  Filesystem = 'Filesystem',
  Block = 'Block',
}
