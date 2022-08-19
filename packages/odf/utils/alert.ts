import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { CEPH_STORAGE_NAMESPACE } from '../../shared/constants';
import { OCSServiceModel } from '../models';

export const getDiskAlertActionPath = () =>
  window.open('https://access.redhat.com/solutions/5194851');

export const launchClusterExpansionModal = async () => {
  try {
    const resources: any = await k8sGet({
      model: OCSServiceModel,
      ns: CEPH_STORAGE_NAMESPACE,
    });
    const storageCluster = {
      resource: resources?.items?.[0],
      resourceModel: OCSServiceModel,
    };
    const modal = await import(
      '../modals/add-capacity/cluster-expansion-modal'
    );
    modal.expansionModal('ADD_CAPACITY_FULL', storageCluster);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error launching modal', e);
  }
};
