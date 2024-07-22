import { getStorageClusterInNs } from '@odf/core/utils';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { StorageClusterModel } from '@odf/shared/models';
import { StorageClusterKind } from '@odf/shared/types';
import { k8sList } from '@openshift-console/dynamic-plugin-sdk';
import { AddCapacityModal } from '../../modals/add-capacity/add-capacity-modal';

export const getDiskAlertActionPath = () =>
  window.open('https://access.redhat.com/solutions/5194851');

// ToDo (epic 4422): Get StorageCluster name and namespace from the Alert object and then use "k8sGet".
export const launchClusterExpansionModal = async (alert, launchModal) => {
  try {
    /*
    const storageCluster = await k8sGet({
      model: StorageClusterModel,
      name: alert?.annotations?.target_name,
      ns: alert?.annotations?.target_namespace,
    });
    launchModal(AddCapacityModal, { isOpen: true, storageCluster });
    */
    const storageCluster = (await k8sList({
      model: StorageClusterModel,
      queryParams: { ns: CEPH_STORAGE_NAMESPACE },
    })) as StorageClusterKind[];
    launchModal(AddCapacityModal, {
      isOpen: true,
      storageCluster: getStorageClusterInNs(
        storageCluster,
        CEPH_STORAGE_NAMESPACE
      ),
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error launching modal', e);
  }
};
