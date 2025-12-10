import { IBM_SCALE_NAMESPACE, SCALE_PROVISIONER } from '@odf/core/constants';
import {
  DiscoveredDevice,
  FileSystemKind,
  LocalDiskKind,
} from '@odf/core/types/scale';
import {
  CSIDriverModel,
  getName,
  StorageClassModel,
  StorageClassResourceKind,
} from '@odf/shared';
import { FileSystemModel, LocalDiskModel } from '@odf/shared/models/scale';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { TFunction } from 'react-i18next';

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
      t('At least one LocalDisk is required for FileSystem creation')
    );
  }

  const fileSystemPayload: FileSystemKind = {
    apiVersion: 'scale.spectrum.ibm.com/v1beta1',
    kind: FileSystemModel.kind,
    metadata: {
      name: fsName,
      namespace: IBM_SCALE_NAMESPACE,
    },
    spec: {
      local: {
        replication: '1-way',
        type: 'shared',
        pools: [
          {
            blockSize: '4M',
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
      t('Failed to create FileSystem: {{error}}', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    );
  }
};

export const createStorageClass = async (
  fileSystem: FileSystemKind,
  t: TFunction
): Promise<StorageClassResourceKind> => {
  if (!fileSystem) {
    throw new Error(t('FileSystem is required for StorageClass creation'));
  }

  const fileSystemName = getName(fileSystem);
  if (!fileSystemName) {
    throw new Error(t('FileSystem name is required'));
  }

  const storageClassPayload: StorageClassResourceKind = {
    apiVersion: 'storage.k8s.io/v1',
    kind: StorageClassModel.kind,
    metadata: {
      name: fileSystemName,
    },
    provisioner: SCALE_PROVISIONER,
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    volumeBindingMode: 'Immediate',
    parameters: {
      volBackendFs: fileSystemName,
    },
  };

  try {
    return await k8sCreate({
      model: StorageClassModel,
      data: storageClassPayload,
    });
  } catch (error) {
    throw new Error(
      t('Failed to create StorageClass: {{error}}', {
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
