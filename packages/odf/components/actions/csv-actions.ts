import { useMemo } from 'react';
import { LSO_OPERATOR } from '@odf/core/constants';
import AddSSCapacityModal from '@odf/core/modals/add-capacity/add-capacity-modal';
import ConfigureSSPerformanceModal from '@odf/core/modals/configure-performance/configure-performance-modal';
import { getName, getNamespace, useFetchCsv } from '@odf/shared';
import { ODFStorageSystem, StorageClusterModel } from '@odf/shared/models';
import { StorageSystemKind } from '@odf/shared/types';
import {
  groupVersionFor,
  isCSVSucceeded,
  isOCSStorageSystem,
  referenceFor,
  referenceForModel,
} from '@odf/shared/utils';
import {
  Action,
  K8sResourceCommon,
  useFlag,
  useK8sModel,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { LaunchModal } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { PROVIDER_MODE } from '../../features';

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
  const isProviderMode = useFlag(PROVIDER_MODE);
  const [csv, csvLoaded, csvLoadError] = useFetchCsv({
    specName: LSO_OPERATOR,
  });

  const isLSOInstalled = csvLoaded && !csvLoadError && isCSVSucceeded(csv);
  const actions = useMemo(() => {
    const items = [];
    if (
      referenceForModel(k8sModel) === referenceForModel(ODFStorageSystem) &&
      isOCSStorageSystem(resource)
    ) {
      items.push(
        AddCapacityStorageSystem(resource as StorageSystemKind, launchModal)
      );
      if (!isProviderMode) {
        items.push(
          ConfigurePerformanceStorageSystem(
            resource as StorageSystemKind,
            launchModal
          )
        );
      }

      if (isLSOInstalled) {
        items.push(AttachStorageStorageSystem(resource as StorageSystemKind));
      }
    }
    return items;
  }, [k8sModel, resource, launchModal, isProviderMode, isLSOInstalled]);

  return useMemo(() => [actions, !inFlight, undefined], [actions, inFlight]);
};

const AttachStorageStorageSystem = (resource: StorageSystemKind): Action => {
  return {
    id: 'attach-storage-lso-storage-system',
    label: 'Attach Storage',
    insertBefore: 'add-capacity-storage-system',
    cta: {
      href: `/odf/system/ns/${getNamespace(resource)}/${referenceForModel(
        StorageClusterModel
      )}/${getName(resource)}/~attachstorage`,
      external: false,
    },
  };
};

const AddCapacityStorageSystem = (
  resource: StorageSystemKind,
  launchModal: LaunchModal
): Action => {
  return {
    id: 'add-capacity-storage-system',
    label: 'Add Capacity',
    insertBefore: 'edit-csv',
    cta: () => {
      launchModal(AddSSCapacityModal as any, {
        extraProps: { resource },
        isOpen: true,
      });
    },
  };
};

const ConfigurePerformanceStorageSystem = (
  resource: StorageSystemKind,
  launchModal: LaunchModal
): Action => {
  return {
    id: 'configure-performance-storage-system',
    label: 'Configure performance',
    insertAfter: 'add-capacity-storage-system',
    cta: () => {
      launchModal(ConfigureSSPerformanceModal as any, {
        extraProps: { resource },
        isOpen: true,
      });
    },
  };
};
