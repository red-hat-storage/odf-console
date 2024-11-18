import {
  CEPH_BUILTIN_MGR_POOL,
  CEPH_BUILTIN_NFS_POOL,
  CEPH_DEFAULT_FS_POOL_PREFIX,
  POOL_TYPE,
} from '../constants/storage-pool-const';
import {
  deleteBlockPoolFromCLI,
  verifyBlockPoolJSON,
  deleteStoragePool,
  createStoragePoolInSCForm,
  fillPoolModalForm,
  checkStoragePoolIsSelectableInSCForm,
  showAvailablePoolsInSCForm,
} from '../views/storage-pool';

describe('Test storage pool creation when creating a new StorageClass', () => {
  beforeEach(() => {
    cy.clickNavLink(['Storage', 'StorageClasses']);
    cy.byTestID('item-create').click();
  });

  it(`does not show hidden pools`, () => {
    showAvailablePoolsInSCForm(POOL_TYPE.BLOCK);
    cy.byTestID(CEPH_BUILTIN_MGR_POOL).should('not.exist');
    cy.byTestID(CEPH_BUILTIN_NFS_POOL).should('not.exist');
  });

  it(`Creates a new ${POOL_TYPE.BLOCK} pool`, () => {
    const poolName = 'sc-block-name';

    cy.log(`Create a new ${POOL_TYPE.BLOCK} pool`);
    createStoragePoolInSCForm(POOL_TYPE.BLOCK, poolName);
    checkStoragePoolIsSelectableInSCForm(poolName);
    verifyBlockPoolJSON(poolName);

    cy.log(
      `Try to create a new ${POOL_TYPE.BLOCK} pool using an existing name`
    );
    fillPoolModalForm(POOL_TYPE.BLOCK, poolName);
    cy.byLegacyTestID('confirm-action').should('be.disabled');
    cy.byLegacyTestID('modal-cancel-action').click();

    deleteBlockPoolFromCLI(poolName);
  });

  it(`Creates a new ${POOL_TYPE.FILESYSTEM} pool`, () => {
    const poolName = 'sc-fs-name';
    const poolFullName = `${CEPH_DEFAULT_FS_POOL_PREFIX}-${poolName}`;

    cy.log(`Create a new ${POOL_TYPE.FILESYSTEM} pool`);
    createStoragePoolInSCForm(POOL_TYPE.FILESYSTEM, poolName);
    checkStoragePoolIsSelectableInSCForm(poolFullName);

    cy.log(
      `Try to create a new ${POOL_TYPE.FILESYSTEM} pool using an existing name`
    );
    fillPoolModalForm(POOL_TYPE.FILESYSTEM, poolName);
    cy.byLegacyTestID('confirm-action').should('be.disabled');
    cy.byLegacyTestID('modal-cancel-action').click();

    deleteStoragePool(poolFullName);
  });
});
