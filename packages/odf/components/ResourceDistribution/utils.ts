import { StorageConsumerKind } from '@odf/shared';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

export const generatePatchForDistributionOfResources = (
  storageConsumer: StorageConsumerKind,
  storageClassNames: string[],
  volumeSnapshotClassNames: string[],
  volumeGroupSnapshotClassNames: string[]
): Patch[] => {
  const patches: Patch[] = [];
  const isStorageClassesDistributed = !_.isEmpty(
    storageConsumer?.spec?.storageClasses
  );
  const isVolumeSnapshotClassesDistributed = !_.isEmpty(
    storageConsumer?.spec?.volumeSnapshotClasses
  );
  const isVolumeGroupSnapshotClassesDistributed = !_.isEmpty(
    storageConsumer?.spec?.volumeGroupSnapshotClasses
  );
  const currentlySelectedStorageClasses =
    storageConsumer.spec?.storageClasses?.map((sc) => sc.name) || [];
  const currentlySelectedVolumeSnapshotClasses =
    storageConsumer.spec?.volumeSnapshotClasses?.map((vsc) => vsc.name) || [];
  const currentlySelectedVolumeGroupSnapshotClasses =
    storageConsumer.spec?.volumeGroupSnapshotClasses?.map(
      (vgsc) => vgsc.name
    ) || [];
  const isStorageClassesChanged =
    storageClassNames.length !== currentlySelectedStorageClasses.length ||
    !storageClassNames.every((res) =>
      currentlySelectedStorageClasses.includes(res)
    );
  const isVolumeSnapshotClassesChanged =
    volumeSnapshotClassNames.length !==
      currentlySelectedVolumeSnapshotClasses.length ||
    !volumeSnapshotClassNames?.every((res) =>
      currentlySelectedVolumeSnapshotClasses?.includes(res)
    );
  const isVolumeGroupSnapshotClassesChanged =
    volumeGroupSnapshotClassNames.length !==
      currentlySelectedVolumeGroupSnapshotClasses.length ||
    !volumeGroupSnapshotClassNames?.every((res) =>
      currentlySelectedVolumeGroupSnapshotClasses?.includes(res)
    );

  if (!isStorageClassesDistributed && !_.isEmpty(storageClassNames)) {
    patches.push({
      op: 'add',
      path: '/spec/storageClasses',
      value: storageClassNames.map((name) => ({ name })),
    });
  } else if (isStorageClassesChanged) {
    patches.push({
      op: 'replace',
      path: '/spec/storageClasses',
      value: storageClassNames.map((name) => ({ name })),
    });
  }

  if (
    !isVolumeSnapshotClassesDistributed &&
    !_.isEmpty(volumeSnapshotClassNames)
  ) {
    patches.push({
      op: 'add',
      path: '/spec/volumeSnapshotClasses',
      value: volumeSnapshotClassNames.map((name) => ({ name })),
    });
  } else if (isVolumeSnapshotClassesChanged) {
    patches.push({
      op: 'replace',
      path: '/spec/volumeSnapshotClasses',
      value: volumeSnapshotClassNames.map((name) => ({ name })),
    });
  }
  if (!isVolumeGroupSnapshotClassesDistributed) {
    patches.push({
      op: 'add',
      path: '/spec/volumeGroupSnapshotClasses',
      value: volumeGroupSnapshotClassNames.map((name) => ({ name })),
    });
  } else if (isVolumeGroupSnapshotClassesChanged) {
    patches.push({
      op: 'replace',
      path: '/spec/volumeGroupSnapshotClasses',
      value: volumeGroupSnapshotClassNames.map((name) => ({ name })),
    });
  }

  return patches;
};
