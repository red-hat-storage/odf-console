import { useMemo } from 'react';
import { ODFStorageSystem } from '@odf/shared/models';
import { StorageSystemKind } from '@odf/shared/types';
import {
  groupVersionFor,
  isOCSStorageSystem,
  referenceFor,
  referenceForModel,
} from '@odf/shared/utils';
import {
  Action,
  K8sResourceCommon,
  useK8sModel,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import AddSSCapacityModal from '../../modals/add-capacity/add-capacity-modal';

export const useCsvActions = ({
  resource,
}: {
  resource: K8sResourceCommon;
}) => {
  const { group, version } = groupVersionFor(resource.apiVersion);
  const [k8sModel, inFlight] = useK8sModel(
    referenceFor(group)(version)(resource.kind)
  );
  const launchModal = useModal();

  const actions = useMemo(
    () =>
      referenceForModel(k8sModel) === referenceForModel(ODFStorageSystem) &&
      isOCSStorageSystem(resource as StorageSystemKind)
        ? [AddCapacityStorageSystem(resource as StorageSystemKind, launchModal)]
        : [],

    [k8sModel, resource, launchModal]
  );

  return useMemo(() => [actions, !inFlight, undefined], [actions, inFlight]);
};

export const AddCapacityStorageSystem = (
  resource: StorageSystemKind,
  launchModal: LaunchModal
): Action => {
  return {
    id: 'add-capacity-storage-system',
    label: 'Add Capacity',
    insertBefore: 'edit-csv',
    cta: () => {
      launchModal(AddSSCapacityModal, {
        extraProps: { resource },
        isOpen: true,
      });
    },
  };
};
