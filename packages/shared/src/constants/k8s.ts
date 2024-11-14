export const enum PVC_STATUS {
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
