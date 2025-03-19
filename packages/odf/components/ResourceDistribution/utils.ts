import { StorageConsumerKind } from '@odf/shared';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';

export const generatePatchForDistributionOfResources = (
  storageConsumer: StorageConsumerKind,
  storageClassNames: string[],
  volumeSnapshotClassNames: string[]
): Patch[] => {
  const patches: Patch[] = [];
  const currentlySelectedStorageClasses =
    storageConsumer.spec?.storageClasses?.map((sc) => sc.name) || [];
  const currentlySelectedVolumeSnapshotClasses =
    storageConsumer.spec?.volumeSnapshotClasses?.map((vsc) => vsc.name) || [];
  const isStorageClassesChanged = storageClassNames.every((res) =>
    currentlySelectedStorageClasses.includes(res)
  );
  const isVolumeSnapshotClassesChanged = volumeSnapshotClassNames?.every(
    (res) => currentlySelectedVolumeSnapshotClasses?.includes(res)
  );

  if (!isStorageClassesChanged) {
    // Create a new object with updated storage classes
    patches.push({
      op: 'replace',
      path: '/spec/storageClasses',
      value: storageClassNames.map((name) => ({ name })),
    });
  }
  if (!storageConsumer.spec?.storageClasses?.length) {
    patches.push({
      op: 'add',
      path: '/spec/storageClasses/-',
      value: storageClassNames.map((name) => ({ name })),
    });
  }
  if (!isVolumeSnapshotClassesChanged) {
    // Create a new object with updated storage classes
    patches.push({
      op: 'replace',
      path: '/spec/volumeSnapshotClasses',
      value: volumeSnapshotClassNames.map((name) => ({ name })),
    });
  }
  if (!storageConsumer.spec?.storageClasses?.length) {
    patches.push({
      op: 'add',
      path: '/spec/volumeSnapshotClasses/-',
      value: volumeSnapshotClassNames.map((name) => ({ name })),
    });
  }
  return patches;
};
