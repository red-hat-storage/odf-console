import { VolumeSnapshotClassKind } from '../types';

export const getDriver = (resource: VolumeSnapshotClassKind) =>
  resource?.driver;
