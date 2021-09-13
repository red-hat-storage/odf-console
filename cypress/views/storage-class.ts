import { defaultPoolName } from './block-pool';

export const storageClass = {
    createStorageClass : (scName: string, poolName?: string) => {
      cy.log(`Create storage class using pool ${poolName}`);
      cy.clickNavLink(['Storage', 'StorageClasses']);
      cy.byTestID('item-create').click();
      cy.byLegacyTestID('storage-class-form')
        .get('input#storage-class-name')
        .type(scName);
  
      cy.log('Selecting Ceph RBD provisioner');
      cy.byTestID('storage-class-provisioner-dropdown').click();
      cy.byLegacyTestID('dropdown-text-filter').type('openshift-storage.rbd.csi.ceph.com');
      cy.byTestID('dropdown-menu-item-link').should('contain', 'openshift-storage.rbd.csi.ceph.com');
      cy.byTestID('dropdown-menu-item-link').click();
  
      cy.log(`Selecting block pool ${poolName}`);
      cy.byTestID('pool-dropdown-toggle').click();
      cy.byTestID(poolName || defaultPoolName).click();
  
      cy.log('Creating new StorageClass');
      cy.byTestID('storage-class-volume-binding-mode').click();
      cy.byTestDropDownMenu('Immediate').click();
      cy.byLegacyTestID('storage-class-form')
        .get('button#save-changes')
        .click();
      cy.byLegacyTestID('resource-title').contains(scName);
    },
  
    deleteStorageClassFromCli : (scName: string) => {
      cy.log('Deleting a storage class');
      cy.exec(`oc delete StorageClass ${scName}`);
    }
  };
