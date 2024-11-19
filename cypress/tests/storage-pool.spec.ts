import {
  PoolProgress,
  CEPH_DEFAULT_BLOCK_POOL_NAME,
  PoolType,
  CEPH_DEFAULT_FS_POOL_NAME,
  CEPH_DEFAULT_FS_POOL_PREFIX,
} from '../constants/storage-pool-const';
import { fieldValidationOnWizardFormsTests } from '../helpers/formValidations';
import { app } from '../support/pages/app';
import { pvc } from '../views/pvc';
import { createStorageClass } from '../views/storage-class';
import {
  scName,
  createStoragePool,
  navigateToStoragePoolList,
  triggerPoolFormFooterAction,
  verifyBlockPoolJSON,
  poolMessage,
  openStoragePoolKebab,
  fillStoragePoolForm,
  deleteStoragePool,
} from '../views/storage-pool';

describe('Block pool on ODF UI', () => {
  const poolName = 'block-name';
  const pvcName: string = 'testing-pvc';

  beforeEach(() => {
    navigateToStoragePoolList();
  });

  it('Check for a new pool creation', () => {
    createStoragePool(PoolType.BLOCK, poolName);
    app.waitForLoad();
    cy.log(`Verify ${PoolType.BLOCK} pool creation`);
    cy.byTestID('status-text').should('contain', 'Ready', {
      timeout: 2 * 60000,
    });
    verifyBlockPoolJSON(poolName);
  });

  it('Test updating a non-default block pool is successful', () => {
    cy.log('Updating a newly created block pool');
    openStoragePoolKebab(poolName);
    cy.byTestActionID('Edit Pool').click();

    cy.contains('Edit Storage Pool');
    cy.byTestID('replica-dropdown').click();
    cy.byLegacyTestID('replica-dropdown-item')
      .contains('3-way Replication')
      .click();
    cy.byTestID('compression-checkbox').uncheck();

    cy.log('Updating pool');
    triggerPoolFormFooterAction('update');

    cy.log('Verify pool update');
    verifyBlockPoolJSON(poolName, false, '3');
  });

  it('Test updating/deleting a default block pool is not allowed', () => {
    cy.log('Kebab action should be disabled');
    openStoragePoolKebab(CEPH_DEFAULT_BLOCK_POOL_NAME, true);
    cy.log(poolMessage(poolName, PoolProgress.NOTALLOWED));
  });

  it('deletion of a non-default pool deletion pool is successful', () => {
    cy.log('Create storage class using newly created pool');
    createStorageClass(scName, poolName);

    cy.log('Create PVC using newly created storage class');
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
    pvc.createPVC(pvcName, '1', scName);
    cy.visit('/');

    cy.log('Delete a newly created block pool');
    navigateToStoragePoolList();
    openStoragePoolKebab(poolName);
    cy.byTestActionID('Delete Pool').click();

    cy.contains('Delete Storage Pool');
    cy.byTestID('pool-bound-message').contains(
      poolMessage(poolName, PoolProgress.BOUNDED)
    );
    cy.byTestID('pool-storage-classes').contains(scName);
    triggerPoolFormFooterAction(PoolProgress.BOUNDED);

    cy.log('Delete pvc and storage class, then try pool deletion');
    cy.exec(`oc delete pvc ${pvcName} -n default`, {
      failOnNonZeroExit: false,
    });
    cy.exec(`oc delete sc ${scName}`, { failOnNonZeroExit: false });

    openStoragePoolKebab(poolName);
    cy.byTestActionID('Delete Pool').click();
    triggerPoolFormFooterAction('delete');
  });
});

describe('Tests form validations on block pool', () => {
  const nameFieldTestId: string = 'new-pool-name-textbox';

  beforeEach(() => {
    navigateToStoragePoolList();
    cy.byTestID('item-create').click();
  });

  fieldValidationOnWizardFormsTests(nameFieldTestId, 'Create', () =>
    fillStoragePoolForm(PoolType.BLOCK, 'test-name')
  );
});

describe('Filesystem pool on ODF UI', () => {
  const poolName = 'fs-name';
  const poolFullName = `${CEPH_DEFAULT_FS_POOL_PREFIX}-${poolName}`;

  beforeEach(() => {
    navigateToStoragePoolList();
  });

  it('creates a new pool', () => {
    createStoragePool(PoolType.FILESYSTEM, poolName);

    cy.log(`Verify ${PoolType.FILESYSTEM} pool creation`);
    cy.byTestID(`${poolFullName}-replicas`).contains('2');
    cy.byTestID(`${poolFullName}-compression`).contains('Enabled');
  });

  it(`updates a non-default pool`, () => {
    cy.log(`Updating a newly created ${PoolType.FILESYSTEM} pool`);
    openStoragePoolKebab(poolFullName);
    cy.byTestActionID('Edit Pool').click();
    cy.contains('Edit Storage Pool');
    cy.byTestID('replica-dropdown').click();
    cy.byLegacyTestID('replica-dropdown-item')
      .contains('3-way Replication')
      .click();
    cy.byTestID('compression-checkbox').uncheck();

    cy.log('Updating pool');
    triggerPoolFormFooterAction('update');

    cy.log('Verify pool update');
    cy.byTestID(`${poolFullName}-replicas`).contains('3');
    cy.byTestID(`${poolFullName}-compression`).contains('Disabled');
  });

  it('deletes a non-default Filesystem pool', () => {
    deleteStoragePool(poolFullName);
  });

  it('actions on the default pool are not allowed', () => {
    cy.log('Kebab action should be disabled');
    openStoragePoolKebab(CEPH_DEFAULT_FS_POOL_NAME, true);
    cy.log(poolMessage[PoolProgress.NOTALLOWED]);
  });
});
