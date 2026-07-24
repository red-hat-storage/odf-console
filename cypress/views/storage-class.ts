import { CEPH_DEFAULT_BLOCK_POOL_NAME } from '../constants/storage-pool-const';

const configureKms = () => {
  cy.byTestID('storage-class-encryption').check();
  cy.byTestID('sc-form-new-kms-radio').click();
  cy.byTestID('kms-service-name-text').type('vault');
  cy.byTestID('vault-config-auth-method').select('token');
  cy.exec(
    'echo http://$(oc get route vault -n hashicorp --no-headers -o custom-columns=HOST:.spec.host)'
  ).then((hostname) => {
    cy.byTestID('kms-address-text').type(hostname.stdout);
  });
  cy.byTestID('kms-address-port-text').type('80');
  cy.byTestID('kms-advanced-settings-link').click();
  cy.byTestID('kms-service-backend-path').type('secret');
  cy.byTestID('save-kms-action').click();
  // Wait for form validation to complete before clicking Save
  cy.byTestID('save-action', { timeout: 30000 })
    .should('not.be.disabled')
    .click();
  cy.byTestID('kms-service-dropdown-toggle').should('contain', 'vault');
};

export const createStorageClass = (
  scName: string,
  poolName?: string,
  encrypted?: boolean
) => {
  cy.clickNavLink(['Storage', 'StorageClasses']);
  cy.byTestID('item-create').click();
  cy.byLegacyTestID('storage-class-form')
    .get('input#storage-class-name')
    .type(scName);

  cy.log('Selecting Ceph RBD provisioner');
  cy.byTestID('storage-class-provisioner-dropdown').should('be.visible');
  cy.byTestID('storage-class-provisioner-dropdown').click();
  cy.byTestID('console-select-search-input', { timeout: 10000 })
    .find('input')
    .should('be.visible');
  cy.byTestID('console-select-search-input').find('input').clear();
  cy.byTestID('console-select-search-input')
    .find('input')
    .type('openshift-storage.rbd.csi.ceph.com');
  cy.byTestID('console-select-menu-list')
    .contains('openshift-storage.rbd.csi.ceph.com', { timeout: 30000 })
    .should('be.visible');
  cy.byTestID('console-select-menu-list')
    .contains('openshift-storage.rbd.csi.ceph.com')
    .click();

  cy.log(`Selecting block pool ${poolName}`);
  cy.byTestID('pool-dropdown-toggle').click();
  cy.byTestID(poolName || CEPH_DEFAULT_BLOCK_POOL_NAME).click();

  if (encrypted) {
    configureKms();
  }

  cy.log('Creating new StorageClass');
  cy.byTestID('storage-class-volume-binding-mode').click();
  cy.byTestDropDownMenu('Immediate').click();
  cy.byLegacyTestID('storage-class-form').get('[id="save-changes"]').click();
  cy.url().should('include', `/storageclasses/${scName}`, { timeout: 30000 });
};

export const deleteStorageClassFromCLI = (scName: string) => {
  cy.log('Deleting a storage class');
  cy.exec(`oc delete StorageClass ${scName}`, { failOnNonZeroExit: false });
};
