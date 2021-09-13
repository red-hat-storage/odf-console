import {
  blockPoolProps,
  navigateToBlockPoolListPage,
  blockPoolCRUDOperations,
  verifyBlockPoolJSON
} from '../views/block-pool';
import { storageClass } from '../views/storage-class';
import { pvc } from '../views/pvc';

export const scName: string = 'testing-sc';
export const pvcName: string = 'testing-pvc';

describe('Test block pool deletion under ODF console UI', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    // custom block pool creation
    blockPoolCRUDOperations.createBlockPool();
  });

  after(() => {
    storageClass.deleteStorageClassFromCli(scName);
    cy.logout();
  });

  it('Successfully deleting custom pool', () => {
    cy.log("Delete PVC bounded block pool");
    storageClass.createStorageClass(scName, blockPoolProps.poolName);
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
    pvc.createPVC(pvcName, '5', scName);
    blockPoolCRUDOperations.deleteBlockPool(true, scName);

    cy.log('Retrying block pool deletion after PVC unbound');
    pvc.deletePVCFromCli(pvcName);
    blockPoolCRUDOperations.deleteBlockPool();
    verifyBlockPoolJSON(blockPoolProps, true);
  });

  it('Ensure the default block pool deletion is blocked from UI', () => {
    cy.log('Click delete kebab action');
    cy.byLegacyTestID('kebab-button')
      .last()
      .should('be.disabled');
  });
});
