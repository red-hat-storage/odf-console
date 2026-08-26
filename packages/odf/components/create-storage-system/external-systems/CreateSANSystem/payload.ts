import { IBM_SCALE_NAMESPACE } from '@odf/core/constants';
import {
  DiscoveredDevice,
  FileSystemKind,
  LocalDiskKind,
} from '@odf/core/types/scale';
import {
  CSIDriverModel,
  getName,
  ReclaimPolicy,
  VolumeBindingMode,
} from '@odf/shared';
import { FileSystemModel, LocalDiskModel } from '@odf/shared/models/scale';
import {
  k8sCreate,
  k8sPatch,
  Patch,
} from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'i18next';

const generateLocalDiskName = (wwn: string) => `localdisk-${wwn}`;

export const createLocalDisks = async (
  disks: DiscoveredDevice[],
  t: TFunction
): Promise<LocalDiskKind[]> => {
  if (!disks || disks.length === 0) {
    throw new Error('No disks provided for LocalDisk creation');
  }

  const localDisks: LocalDiskKind[] = disks.map((disk) => {
    if (!disk.WWN || !disk.path || !disk.nodeName) {
      throw new Error(
        t(
          'Invalid disk data: missing required fields (WWN: {{wwn}}, path: {{path}}, nodeName: {{nodeName}})',
          {
            wwn: disk.WWN,
            path: disk.path,
            nodeName: disk.nodeName,
          }
        )
      );
    }
    return {
      apiVersion: 'scale.spectrum.ibm.com/v1beta1',
      kind: LocalDiskModel.kind,
      metadata: {
        name: generateLocalDiskName(disk.WWN),
        namespace: IBM_SCALE_NAMESPACE,
        labels: {
          discovered: 'true',
        },
      },
      spec: {
        device: disk.path,
        wwn: disk.WWN,
        capacity: String(disk.size),
        node: disk.nodeName,
      },
    };
  });

  try {
    return await Promise.all(
      localDisks.map((disk) => k8sCreate({ model: LocalDiskModel, data: disk }))
    );
  } catch (error) {
    throw new Error(
      t('Failed to create LocalDisks: {{error}}', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
};

export const updateLocalFileSystem = async (
  fileSystem: FileSystemKind,
  localDisks: LocalDiskKind[],
  t: TFunction
): Promise<FileSystemKind> => {
  if (!fileSystem || !localDisks || localDisks.length === 0) {
    throw new Error(t('Filesystem and Localdisks are required for update'));
  }
  const patches: Patch[] = localDisks.map((disk) => ({
    op: 'add',
    path: '/spec/local/pools/0/disks/-',
    value: getName(disk),
  }));

  try {
    return await k8sPatch({
      model: FileSystemModel,
      resource: fileSystem,
      data: patches,
    });
  } catch (error) {
    throw new Error(
      t('Failed to update Filesystem: {{error}}', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
};

export const createLocalFileSystem = async (
  fsName: string,
  localDisks: LocalDiskKind[],
  t: TFunction
): Promise<FileSystemKind> => {
  if (!fsName || fsName.trim() === '') {
    throw new Error(t('FileSystem name is required'));
  }
  if (!localDisks || localDisks.length === 0) {
    throw new Error(
      t('At least one Localdisk is required for Filesystem creation')
    );
  }

  const fileSystemPayload: FileSystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: 'Filesystem',
    metadata: {
      name: fsName,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      storageClasses: [
        {
          name: `san-${fsName}`,
          reclaimPolicy: ReclaimPolicy.Delete,
          allowVolumeExpansion: true,
          volumeBindingMode: VolumeBindingMode.Immediate,
        },
        {
          name: `san-${fsName}-vm`,
          reclaimPolicy: ReclaimPolicy.Delete,
          allowVolumeExpansion: true,
          volumeBindingMode: VolumeBindingMode.Immediate,
          parameters: {
            volBackendFs: fsName,
            volumeType: 'vmdisk',
          },
        },
      ],
      local: {
        replication: '1-way',
        type: 'shared',
        blockSize: '4M',
        pools: [
          {
            disks: localDisks.map((disk) => getName(disk)),
            name: 'system', // Default pool name as per IBM Scale conventions
          },
        ],
      },
    },
  };

  try {
    return await k8sCreate({ model: FileSystemModel, data: fileSystemPayload });
  } catch (error) {
    throw new Error(
      t('Failed to create Filesystem: {{error}}', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
};

export const createCSIDriver = () => {
  const payload = {
    apiVersion: 'storage.k8s.io/v1',
    kind: CSIDriverModel.kind,
    metadata: {
      name: 'spectrumscale.csi.ibm.com',
    },
    spec: {
      attachRequired: true,
      fsGroupPolicy: 'File',
      podInfoOnMount: true,
    },
  };
  return k8sCreate({
    model: CSIDriverModel,
    data: payload,
  });
};
