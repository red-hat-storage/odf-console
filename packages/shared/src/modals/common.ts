import { StorageClusterKind } from '@odf/shared/types/storage';

export type CommonModalProps<T = {}> = {
  isOpen: boolean;
  closeModal: () => void;
  extraProps?: {
    [key: string]: any;
  } & T;
};

export type StorageClusterActionModalProps = CommonModalProps<{
  storageCluster: StorageClusterKind;
}>;
