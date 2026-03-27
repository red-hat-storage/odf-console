import { useMemo } from 'react';
import { NOOBAA_PROVISIONER } from '@odf/core/constants';
import {
  getDriver,
  getProvisioner,
  StorageClassModel,
  StorageClassResourceKind,
  VolumeSnapshotClassKind,
  VolumeSnapshotClassModel,
} from '@odf/shared';
import { isCephDriver, isCephProvisioner } from '@odf/shared/utils';
import {
  Action,
  K8sModel,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { StorageClientAttacherModal } from './StorageClientAttacherModal';

const isStorageClass = (
  resource: StorageClassResourceKind | VolumeSnapshotClassKind
): resource is StorageClassResourceKind =>
  resource.kind === StorageClassModel.kind;

const isVolumeSnapshotClass = (
  resource: StorageClassResourceKind | VolumeSnapshotClassKind
): resource is VolumeSnapshotClassKind =>
  resource.kind === VolumeSnapshotClassModel.kind;

export const useStorageClientAttacherAction = (
  resource: StorageClassResourceKind | VolumeSnapshotClassKind
) => {
  const launchModal = useModal();
  const actions = useMemo(() => {
    const items = [];
    if (
      isStorageClass(resource) &&
      (isCephProvisioner(getProvisioner(resource)) ||
        getProvisioner(resource)?.endsWith(NOOBAA_PROVISIONER))
    ) {
      items.push(
        AttachResourceToStorageClientModal(
          resource,
          StorageClassModel,
          launchModal
        )
      );
    }
    if (isVolumeSnapshotClass(resource) && isCephDriver(getDriver(resource))) {
      items.push(
        AttachResourceToStorageClientModal(
          resource,
          VolumeSnapshotClassModel,
          launchModal
        )
      );
    }
    return [items, true, undefined];
  }, [resource, launchModal]);
  return actions;
};

const AttachResourceToStorageClientModal = (
  resource: StorageClassResourceKind | VolumeSnapshotClassKind,
  resourceModel: K8sModel,
  launchModal: LaunchModal
): Action => {
  return {
    id: 'attach-resources',
    label: 'Distribute to storage clients',
    insertBefore: 'edit-labels',
    cta: () => {
      launchModal(StorageClientAttacherModal, {
        extraProps: { resource, resourceModel },
        isOpen: true,
        closeModal: null,
      });
    },
  };
};
