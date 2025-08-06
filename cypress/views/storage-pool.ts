import {
  CEPH_DEFAULT_BLOCK_POOL_NAME,
  CEPH_DEFAULT_FS_POOL_NAME,
  PoolProgress,
  PoolType,
} from '../constants/storage-pool-const';
import { SECOND } from '../consts';
import { NS } from '../utils/consts';
import { ODFCommon } from '../views/odf-common';
import { modal } from './modals';

// Pool var
export const replicaCount: string = '2';
export const scName: string = 'testing-sc';

export const poolMessage = (
  poolName: string,
  poolProgress: PoolProgress
): string => {
  switch (poolProgress) {
    case PoolProgress.FAILED:
      return `Pool "${poolName}" already exists`;
    case PoolProgress.CREATED:
      return `Pool ${poolName} was successfully created`;
    case PoolProgress.NOTALLOWED:
      return "Pool management tasks are not supported for default pool and ODF's external mode.";
    case PoolProgress.BOUNDED:
      return `${poolName} cannot be deleted. When a pool is bounded to PVC it cannot be deleted. Please detach all the resources from StorageClass(es):`;
    default:
      return '';
  }
};

export const navigateToStoragePoolList = () => {
  ODFCommon.visitStorageCluster();
  cy.byTestID('horizontal-link-Block and File').should('be.visible');
  cy.byTestID('horizontal-link-Storage pools').click();
};

export const showAvailablePoolsInSCForm = (poolType: PoolType) => {
  const provisioner = poolType === PoolType.BLOCK ? 'rbd' : 'cephfs';
  const defaultPool =
    poolType === PoolType.BLOCK
      ? CEPH_DEFAULT_BLOCK_POOL_NAME
      : CEPH_DEFAULT_FS_POOL_NAME;

  cy.log('Selecting provisioner');
  cy.byTestID('storage-class-provisioner-dropdown').click();
  cy.byLegacyTestID('dropdown-text-filter').type(
    `openshift-storage.${provisioner}.csi.ceph.com`
  );
  cy.byTestID('dropdown-menu-item-link')
    .contains(`openshift-storage.${provisioner}.csi.ceph.com`)
    .click();
  cy.log('Show Storage pool list.');
  cy.byTestID('pool-dropdown-toggle', { timeout: 5 * SECOND })
    .should('be.visible')
    .click();
  cy.byTestID('create-new-pool-button').should('be.visible');
  cy.byTestID(defaultPool).should('be.visible');
};

export const fillPoolModalForm = (poolType: PoolType, poolName: string) => {
  showAvailablePoolsInSCForm(poolType);
  cy.log('Click on: Create new storage pool');
  cy.byTestID('create-new-pool-button').click();
  cy.log('Make sure the storage pool creation form modal is opened.');
  modal.shouldBeOpened();
  modal.modalTitleShouldContain('Create Storage Pool');
  fillStoragePoolForm(poolType, poolName);
};

export const createStoragePoolInSCForm = (
  poolType: PoolType,
  poolName: string
) => {
  fillPoolModalForm(poolType, poolName);
  triggerPoolFormFooterAction('create');

  cy.log(`Verify the ${poolType} pool creation`);
  cy.byTestID('empty-state-body').contains(
    poolMessage(poolName, PoolProgress.CREATED)
  );
  triggerPoolFormFooterAction(PoolProgress.CREATED);
  cy.byTestID('pool-dropdown-toggle').contains(poolName);
};

export const checkStoragePoolIsSelectableInSCForm = (poolName: string) => {
  cy.byTestID('pool-dropdown-toggle').should('be.visible').click();
  cy.byTestID(poolName).should('be.visible');
};

export const fillStoragePoolForm = (poolType: PoolType, poolName: string) => {
  cy.byTestID(`type-${poolType.toLowerCase()}`).click();
  cy.byTestID('new-pool-name-textbox').clear();
  cy.byTestID('new-pool-name-textbox').type(poolName);
  cy.byTestID('replica-dropdown')
    .should('be.visible')
    .should('not.be.disabled')
    .click();
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(`${replicaCount}-way Replication`)
    .should('be.visible')
    .click();
  cy.byTestID('replica-dropdown').should(
    'contain',
    `${replicaCount}-way Replication`
  );
  cy.byTestID('compression-checkbox').check();
};

export const triggerPoolFormFooterAction = (action: string) => {
  switch (action) {
    case PoolProgress.FAILED:
      cy.log('Check try-again-action and finish-action are enabled');
      cy.byLegacyTestID('modal-try-again-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case PoolProgress.CREATED:
      cy.log('Check finish-action is enabled');
      cy.byLegacyTestID('modal-finish-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case PoolProgress.NOTALLOWED:
      cy.log('Check close-action is enabled');
      cy.byLegacyTestID('modal-close-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    case PoolProgress.BOUNDED:
      cy.log('Check go-to-pvc-list-action and close-action are enabled');
      cy.byLegacyTestID('modal-go-to-pvc-list-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    default:
      cy.log(`Invoke ${action} action`);
      cy.byLegacyTestID('confirm-action').scrollIntoView();
      cy.byLegacyTestID('confirm-action').should('be.visible');
      cy.byLegacyTestID('confirm-action').click();
  }
};

export const verifyBlockPoolJSON = (
  poolName: string,
  compressionEnabled: boolean = true,
  replica: string = replicaCount
) => {
  cy.exec(
    `oc get cephBlockPool ${CEPH_DEFAULT_BLOCK_POOL_NAME} -n ${NS} -o json`
  ).then((response) => {
    const defaultBlockPool = JSON.parse(response.stdout);
    const defaultDeviceClass = defaultBlockPool.spec?.deviceClass;
    cy.exec(`oc get cephBlockPool ${poolName} -n ${NS} -o json`).then((res) => {
      const blockPool = JSON.parse(res.stdout);
      expect(blockPool.spec?.replicated?.size).to.equal(Number(replica));
      expect(blockPool.spec?.compressionMode).to.equal(
        compressionEnabled ? 'aggressive' : 'none'
      );
      expect(blockPool.spec?.parameters?.compression_mode).to.equal(
        compressionEnabled ? 'aggressive' : 'none'
      );
      expect(blockPool.spec?.deviceClass).to.equal(defaultDeviceClass);
    });
  });
};

export const createStoragePool = (poolType: PoolType, poolName: string) => {
  cy.byTestID('item-create', { timeout: 10000 }).should('be.visible').click();
  fillStoragePoolForm(poolType, poolName);
  triggerPoolFormFooterAction('create');
};

export const deleteBlockPoolFromCLI = (poolName: string) => {
  cy.log('Deleting the block pool');
  cy.exec(`oc delete CephBlockPool ${poolName} -n ${NS}`);
};

export const openStoragePoolKebab = (
  targetPoolName: string,
  isDefaultPool = false
) => {
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type(targetPoolName);
  cy.log('Only one resource should be present after filtering');
  cy.byTestID('storage-pool-kebab-button').should('have.length', 1);
  if (isDefaultPool)
    cy.byTestID('storage-pool-kebab-button').should('be.disabled');
  else cy.byTestID('storage-pool-kebab-button').click();
};

export const deleteStoragePool = (poolName: string) => {
  cy.log(`Delete a newly created pool`);
  navigateToStoragePoolList();
  openStoragePoolKebab(poolName);
  cy.byTestActionID('Delete Pool').click();
  cy.contains('Delete Storage Pool', { timeout: 5 * 1000 });
  triggerPoolFormFooterAction('delete');

  cy.log('Verify that the pool is not found.');
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type(poolName);
  cy.byTestID('storage-pool-kebab-button').should('have.length', 0);
};
