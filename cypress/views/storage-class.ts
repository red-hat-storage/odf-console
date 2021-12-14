import { defaultPoolName } from './block-pool';

export const storageClass = {
    navigateToStorageClassCreationForm : () => {
      cy.clickNavLink(['Storage', 'StorageClasses']);
      cy.byTestID('item-create').click();
    },

    selectProvisioner : (provisioner?: string) => {
      cy.byTestID('storage-class-provisioner-dropdown').click();
      cy.byLegacyTestID('dropdown-text-filter').type(provisioner || 'openshift-storage.rbd.csi.ceph.com');
      cy.byTestID('dropdown-menu-item-link').should('contain', 'openshift-storage.rbd.csi.ceph.com');
      cy.byTestID('dropdown-menu-item-link').click();
    },

    createStorageClass : (scName: string, poolName?: string) => {
      cy.log(`Create storage class using pool ${poolName}`);
      storageClass.navigateToStorageClassCreationForm();
      
      cy.log('Populating storage class form');
      cy.byLegacyTestID('storage-class-form')
        .get('input#storage-class-name')
        .type(scName);
      cy.byTestID('storage-class-volume-binding-mode').click();
      cy.byTestDropDownMenu('Immediate').click();
  
      cy.log('Selecting provisioner');
      storageClass.selectProvisioner();
  
      cy.log(`Selecting block pool ${poolName}`);
      cy.byTestID('pool-dropdown-toggle').click();
      cy.byTestID(poolName || defaultPoolName).click();
  
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
