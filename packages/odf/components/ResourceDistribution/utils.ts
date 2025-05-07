import { StorageConsumerKind } from '@odf/shared';
import { Patch } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';

const getInitiallySelectedStorageClasses = (
  storageConsumer: StorageConsumerKind
): string[] => {
  const storageClasses = storageConsumer?.spec?.storageClasses || [];
  return storageClasses.map((sc) => sc.name);
};

const getInitiallySelectedVolumeSnapshotClasses = (
  storageConsumer: StorageConsumerKind
): string[] => {
  const volumeSnapshotClasses =
    storageConsumer?.spec?.volumeSnapshotClasses || [];
  return volumeSnapshotClasses.map((vsc) => vsc.name);
};

const generatePatchToModifyResourcesForDistribution = (
  storageConsumer: StorageConsumerKind,
  resourceType: 'SC' | 'VSC',
  resourceNames: string[]
): Patch[] => {
  const patches: Patch[] = [];
  const path =
    resourceType === 'SC'
      ? '/spec/storageClasses'
      : '/spec/volumeSnapshotClasses';
  const currentlySelectedResources =
    resourceType === 'SC'
      ? getInitiallySelectedStorageClasses(storageConsumer)
      : getInitiallySelectedVolumeSnapshotClasses(storageConsumer);
  const removedResources = currentlySelectedResources.filter(
    (sc) => !resourceNames.includes(sc)
  );
  const addedResources = resourceNames.filter(
    (sc) => !currentlySelectedResources.includes(sc)
  );
  if (removedResources.length > 0) {
    patches.push({
      op: 'replace',
      path,
      value: resourceNames.map((name) => ({ name })),
    });
  }
  if (addedResources.length > 0) {
    patches.push({
      op: 'add',
      path,
      value: resourceNames.map((name) => ({ name })),
    });
  }
  return patches;
};

export const generatePatchToModifyStorageClasses = (
  storageConsumer: StorageConsumerKind,
  storageClassNames: string[]
): Patch[] =>
  generatePatchToModifyResourcesForDistribution(
    storageConsumer,
    'SC',
    storageClassNames
  );

export const generatePatchToModifyVolumeSnapshotClasses = (
  storageConsumer: StorageConsumerKind,
  volumeSnapshotClassNames: string[]
): Patch[] =>
  generatePatchToModifyResourcesForDistribution(
    storageConsumer,
    'VSC',
    volumeSnapshotClassNames
  );

export const generatePatchForDistributionOfResources = (
  storageConsumer: StorageConsumerKind,
  storageClassNames: string[],
  volumeSnapshotClassNames: string[]
): Patch[] => {
  const patches: Patch[] = [];
  const storageClassPatches = generatePatchToModifyStorageClasses(
    storageConsumer,
    storageClassNames
  );
  const volumeSnapshotClassPatches = generatePatchToModifyVolumeSnapshotClasses(
    storageConsumer,
    volumeSnapshotClassNames
  );
  patches.push(...storageClassPatches);
  patches.push(...volumeSnapshotClassPatches);
  return patches;
};
