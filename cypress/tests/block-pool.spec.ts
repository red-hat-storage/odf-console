import {
  POOL_PROGRESS,
  CEPH_DEFAULT_BLOCK_POOL_NAME,
} from '../constants/storage-pool-const';
import { fieldValidationOnWizardFormsTests } from '../helpers/formValidations';
import {
  poolName,
  scName,
  createBlockPool,
  navigateToBlockPool,
  verifyFooterActions,
  verifyBlockPoolJSON,
  poolMessage,
  openBlockPoolKebab,
  populateBlockPoolForm,
} from '../views/block-pool';
import { pvc } from '../views/pvc';
import { createStorageClass } from '../views/storage-class';

describe('Test block pool under ODF UI', () => {
  const pvcName: string = 'testing-pvc';

  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    navigateToBlockPool();
  });

  it('Check for a new pool creation', () => {
    createBlockPool();
  });

  it('Test updating a non-default block pool is successful', () => {
    cy.log('Updating a newly created block pool');
    openBlockPoolKebab(poolName);
    cy.byTestActionID('Edit BlockPool').click();

    cy.contains('Edit BlockPool');
    cy.byTestID('replica-dropdown').click();
    cy.byLegacyTestID('replica-dropdown-item')
      .contains('3-way Replication')
      .click();
    cy.byTestID('compression-checkbox').uncheck();

    cy.log('Updating pool');
    verifyFooterActions('update');

    cy.log('Verify pool update');
    verifyBlockPoolJSON(false, '3');
  });

  it('Test updating/deleting a default block pool is not allowed', () => {
    cy.log('Kebab action should be disabled');
    openBlockPoolKebab(CEPH_DEFAULT_BLOCK_POOL_NAME, true);
    cy.log(poolMessage[POOL_PROGRESS.NOTALLOWED]);
  });

  it('deletion of a non-default pool deletion pool is successful', () => {
    cy.log('Create storage class using newly created pool');
    createStorageClass(scName, poolName);

    cy.log('Create PVC using newly created storage class');
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
    pvc.createPVC(pvcName, '1', scName);
    cy.visit('/');

    cy.log('Delete a newly created block pool');
    navigateToBlockPool();
    openBlockPoolKebab(poolName);
    cy.byTestActionID('Delete BlockPool').click();

    cy.contains('Delete BlockPool');
    cy.byTestID('pool-bound-message').contains(
      poolMessage[POOL_PROGRESS.BOUNDED]
    );
    cy.byTestID('pool-storage-classes').contains(scName);
    verifyFooterActions(POOL_PROGRESS.BOUNDED);

    cy.log('Delete pvc and storage class, then try pool deletion');
    cy.exec(`oc delete pvc ${pvcName} -n default`, {
      failOnNonZeroExit: false,
    });
    cy.exec(`oc delete sc ${scName}`, { failOnNonZeroExit: false });

    openBlockPoolKebab(poolName);
    cy.byTestActionID('Delete BlockPool').click();
    verifyFooterActions('delete');
  });
});

describe('Tests form validations on BlockPool', () => {
  const nameFieldTestId: string = 'new-pool-name-textbox';
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    navigateToBlockPool();
    cy.byTestID('item-create').click();
  });

  after(() => {
    cy.logout();
  });

  fieldValidationOnWizardFormsTests(
    nameFieldTestId,
    'Create',
    populateBlockPoolForm
  );
});
