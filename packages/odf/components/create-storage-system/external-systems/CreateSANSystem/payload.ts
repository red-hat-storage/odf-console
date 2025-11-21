import { IBM_SCALE_NAMESPACE, SCALE_PROVISIONER } from '@odf/core/constants';
import {
  DiscoveredDevice,
  FileSystemKind,
  LocalDiskKind,
} from '@odf/core/types/scale';
import {
  getName,
  StorageClassModel,
  StorageClassResourceKind,
} from '@odf/shared';
import { FileSystemModel, LocalDiskModel } from '@odf/shared/models/scale';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';

const generateLocalDiskName = (wwn: string) => `localdisk-${wwn}`;

export const createLocalDisks = async (disks: DiscoveredDevice[]) => {
  const localDisks: LocalDiskKind[] = disks.map((disk) => ({
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
  }));
  return Promise.all(
    localDisks.map((disk) => k8sCreate({ model: LocalDiskModel, data: disk }))
  );
};

export const createLocalFileSystem = async (
  fsName: string,
  localDisks: LocalDiskKind[]
) => {
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
            name: '',
          },
        ],
      },
    },
  };
  return k8sCreate({ model: FileSystemModel, data: fileSystemPayload });
};

export const createStorageClass = async (fileSystem: FileSystemKind) => {
  const storageClassPayload: StorageClassResourceKind = {
    apiVersion: 'storage.k8s.io/v1',
    kind: StorageClassModel.kind,
    metadata: {
      name: getName(fileSystem),
    },
    provisioner: SCALE_PROVISIONER,
    reclaimPolicy: 'Delete',
    allowVolumeExpansion: true,
    volumeBindingMode: 'Immediate',
    parameters: {
      volBackendFs: getName(fileSystem),
    },
  };
  return k8sCreate({ model: StorageClassModel, data: storageClassPayload });
};
