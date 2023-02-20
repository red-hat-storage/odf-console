const configureKms = () => {
  cy.byTestID('storage-class-encryption').check();
  cy.byTestID('sc-form-new-kms-radio').click();
  cy.byTestID('kms-service-name-text').type('vault');
  cy.byTestID('vault-config-auth-method').select('token');
  cy.exec(
    'echo http://$(oc get route vault --no-headers -o custom-columns=HOST:.spec.host)'
  ).then((hostname) => {
    cy.byTestID('kms-address-text').type(hostname.stdout);
  });
  cy.byTestID('kms-address-port-text').type('80');
  cy.byTestID('kms-advanced-settings-link').click();
  cy.byTestID('kms-service-backend-path').type('secret');

  // save
  cy.byTestID('save-kms-action').click();
  cy.byTestID('save-action').click();
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
  cy.byTestID('storage-class-provisioner-dropdown').click();
  cy.byLegacyTestID('dropdown-text-filter').type(
    'openshift-storage.rbd.csi.ceph.com'
  );
  cy.byTestID('dropdown-menu-item-link').should(
    'contain',
    'openshift-storage.rbd.csi.ceph.com'
  );
  cy.byTestID('dropdown-menu-item-link').click();

  if (encrypted) {
    cy.log('Enabling encryption');
    configureKms();
  }

  cy.log(`Selecting block pool ${poolName}`);
  cy.byTestID('pool-dropdown-toggle').click();
  cy.byTestID(poolName || 'ocs-storagecluster-cephblockpool').click();

  cy.log('Creating new StorageClass');
  cy.byTestID('storage-class-volume-binding-mode').click();
  cy.byTestDropDownMenu('Immediate').click();
  cy.byLegacyTestID('storage-class-form').get('button#save-changes').click();
  cy.byTestSelector('details-item-value__Name').contains(scName);
};

export const deleteStorageClassFromCLI = (scName: string, ns = 'default') => {
  cy.log('Deleting a storage class');
  cy.exec(`oc delete StorageClass ${scName} -n ${ns}`);
};
