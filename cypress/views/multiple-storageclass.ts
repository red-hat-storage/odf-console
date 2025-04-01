import {
  K8sResourceKind,
  DeviceSet,
  getCurrentDeviceSetIndex,
} from '../mocks/ksm';

export const NS = 'openshift-storage';
export const OCS_INTERNAL_CR_NAME = 'ocs-storagecluster';
export const withJSONResult = (
  res: Cypress.Exec,
  scName: string,
  iAndD: IndexAndDeviceSet
) => {
  const jsonOut: K8sResourceKind = JSON.parse(res.stdout);
  iAndD.deviceSets = jsonOut.spec.storageDeviceSets;
  iAndD.index = getCurrentDeviceSetIndex(iAndD.deviceSets, scName);
};

export const fetchStorageClusterJson = () =>
  cy.exec(
    `kubectl get --ignore-not-found storagecluster ${OCS_INTERNAL_CR_NAME} -n ${NS} -o json`
  );

export const fetchWorkerNodesJson = () =>
  cy.exec('oc get nodes -l "node-role.kubernetes.io/worker" -o json');

export const addCapacity = (scName: string) => {
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type('ocs-storagecluster');
  cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
  cy.byTestID('kebab-button').click();
  cy.contains('Add Capacity').click();
  // eslint-disable-next-line cypress/no-unnecessary-waiting
  cy.byTestID('add-cap-sc-dropdown').wait(1500).click();
  cy.contains(scName).click();
  cy.byLegacyTestID('confirm-action').click();
};

export const newStorageClassTests = (
  beforeCapacityAddition: UidAndDeviceSet,
  iAndD: IndexAndDeviceSet,
  portability: boolean
) => {
  const portabilityStatus = portability ? 'enabled' : 'disabled';
  cy.log('New device set is created');
  expect(iAndD.deviceSets.length).to.equal(
    beforeCapacityAddition.deviceSets.length + 1
  );

  cy.log('Device count is 1 in the new device set');
  expect(iAndD.deviceSets[iAndD.index].count).to.equal(1);

  cy.log(`Osd portability is ${portabilityStatus} in the new device set`);
  expect(iAndD.deviceSets[iAndD.index].portable).to.equal(portability);
};

export const existingStorageClassTests = (
  beforeCapacityAddition: UidAndDeviceSet,
  iAndD: IndexAndDeviceSet
) => {
  cy.log('New device set is not created');
  expect(iAndD.deviceSets.length).to.equal(
    beforeCapacityAddition.deviceSets.length
  );

  cy.log('Devices count is incremented by 1 in the corresponding device set');
  expect(iAndD.deviceSets[iAndD.index].count).to.equal(
    beforeCapacityAddition.devicesCount + 1
  );

  cy.log('Osd portability is not modified in the corresponding device set');
  expect(iAndD.deviceSets[iAndD.index].portable).to.equal(
    beforeCapacityAddition.portability
  );
};

export interface IndexAndDeviceSet {
  index: number;
  deviceSets: DeviceSet[];
}

export interface UidAndDeviceSet {
  uid: string;
  deviceSets: DeviceSet[];
  portability?: boolean;
  devicesCount?: number;
}
