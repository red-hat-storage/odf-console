import { CEPH_DEFAULT_BLOCK_POOL_NAME } from '../constants/storage-pool-const';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const configureKms = () => {
  cy.byTestID('storage-class-encryption').check();
  cy.byTestID('sc-form-new-kms-radio').click();
  cy.byTestID('kms-service-name-text').type('vault');
  cy.byTestID('vault-config-auth-method').select('token');
  cy.exec(
    'oc get route vault --no-headers -o custom-columns=HOST:.spec.host -n hashicorp'
  ).then((res) => {
    const hostname = res.stdout.trim();
    cy.byTestID('kms-address-text').type(`http://${hostname}`);
  });
  cy.byTestID('kms-address-port-text').type('80');
  cy.byTestID('kms-advanced-settings-link').click();
  cy.byTestID('kms-service-backend-path').type('secret');
  cy.byTestID('save-kms-action').click();
  cy.byTestID('save-action').click();
  cy.byTestID('kms-service-dropdown-toggle').should('contain', 'vault');
};

export const createStorageClass = (
  scName: string,
  poolName?: string,
  _encrypted?: boolean
) => {
  cy.clickNavLink(['Storage', 'StorageClasses']);
  cy.byTestID('item-create').click();
  cy.byLegacyTestID('storage-class-form')
    .get('input#storage-class-name')
    .type(scName);

  cy.log('Selecting Ceph RBD provisioner');
  cy.byTestID('storage-class-provisioner-dropdown')
    .should('be.visible')
    .click();
  // eslint-disable-next-line cypress/require-data-selectors
  cy.get('[placeholder="Select Provisioner"]', { timeout: 10000 })
    .should('be.visible')
    .clear();
  // eslint-disable-next-line cypress/require-data-selectors
  cy.get('[placeholder="Select Provisioner"]').type(
    'openshift-storage.rbd.csi.ceph.com'
  );
  // eslint-disable-next-line cypress/require-data-selectors
  cy.contains('[role="option"]', 'openshift-storage.rbd.csi.ceph.com', {
    timeout: 30000,
  })
    .should('be.visible')
    .scrollIntoView();
  cy.contains('[role="option"]', 'openshift-storage.rbd.csi.ceph.com').click();

  cy.log(`Selecting block pool ${poolName}`);
  cy.byTestID('pool-dropdown-toggle').click();
  cy.byTestID(poolName || CEPH_DEFAULT_BLOCK_POOL_NAME).click();

  cy.log('Creating new StorageClass');
  cy.byTestID('storage-class-volume-binding-mode').click();
  cy.byTestDropDownMenu('Immediate').click();
  cy.byLegacyTestID('storage-class-form').get('[id="save-changes"]').click();
  cy.byTestSelector('details-item-value__Name').contains(scName);
};

export const deleteStorageClassFromCLI = (scName: string) => {
  cy.log('Deleting a storage class');
  cy.exec(`oc delete StorageClass ${scName}`, { failOnNonZeroExit: false });
};
