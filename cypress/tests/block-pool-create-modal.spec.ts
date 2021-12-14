import { blockPoolCRUDOperations } from '../views/block-pool';
import { storageClass } from '../views/storage-class';


describe('Test block pool creation under storage class form', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    blockPoolCRUDOperations.deleteBlockPoolFromCli();
    cy.logout();
  });

  it('Check for a new pool creation', () => {
    storageClass.navigateToStorageClassCreationForm();
    cy.wait(5000);
    storageClass.selectProvisioner();
    blockPoolCRUDOperations.createBlockPoolModal();
  
    cy.log('Create a new pool with already existing name');
    storageClass.selectProvisioner();
    blockPoolCRUDOperations.createBlockPoolModal(true);
  });
});