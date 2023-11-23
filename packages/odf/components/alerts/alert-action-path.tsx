import { StorageClusterModel } from '@odf/ocs/models';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { OCS_INTERNAL_CR_NAME } from '../../constants';
import { AddCapacityModal } from '../../modals/add-capacity/add-capacity-modal';

export const getDiskAlertActionPath = () =>
  window.open('https://access.redhat.com/solutions/5194851');

export const launchClusterExpansionModal = async (alert, launchModal) => {
  try {
    const storageCluster = await k8sGet({
      model: StorageClusterModel,
      name: OCS_INTERNAL_CR_NAME,
      // ToDo (epic 4422): Get StorageCluster name and namespace from the alert object
      // else add a wrapper around "AddCapacityModal" and poll for revelant SC there.
      ns: CEPH_STORAGE_NAMESPACE,
    });
    launchModal(AddCapacityModal, { isOpen: true, storageCluster });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error launching modal', e);
  }
};
