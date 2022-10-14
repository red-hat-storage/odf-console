import {
  configureVault,
  cleanUpVault,
  isPodRunningWithEncryptedPV,
} from '../support/vault-standalone';
import { pvc, deletePVCFromCLI } from '../views/pvc';
import {
  createStorageClass,
  deleteStorageClassFromCLI,
} from '../views/storage-class';

describe('Test Ceph pool creation', () => {
  const scName: string = 'sc-encrypt';
  const pvcName: string = 'encrypted-pvc';

  before(() => {
    configureVault();
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cleanUpVault();
    deleteStorageClassFromCLI(scName);
    deletePVCFromCLI(pvcName);
  });

  it('SC KMS encryption', () => {
    createStorageClass(scName, '', true);
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
    pvc.createPVC(pvcName, '1', scName);
    isPodRunningWithEncryptedPV();
  });
});
