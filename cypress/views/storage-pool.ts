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
  cy.byTestID('horizontal-link-Storage pools').should('be.visible');
  cy.byTestID('horizontal-link-Storage pools').click();
};

export const showAvailablePoolsInSCForm = (poolType: PoolType) => {
  const provisioner = poolType === PoolType.BLOCK ? 'rbd' : 'cephfs';
  const provisionerFullName = `openshift-storage.${provisioner}.csi.ceph.com`;
  const defaultPool =
    poolType === PoolType.BLOCK
      ? CEPH_DEFAULT_BLOCK_POOL_NAME
      : CEPH_DEFAULT_FS_POOL_NAME;

  cy.byTestID('storage-class-provisioner-dropdown').should('be.visible');
  cy.byTestID('storage-class-provisioner-dropdown').click();
  cy.byTestID('console-select-search-input', { timeout: 10000 })
    .find('input')
    .should('be.visible');
  cy.byTestID('console-select-search-input').find('input').clear();
  cy.byTestID('console-select-search-input')
    .find('input')
    .type(provisionerFullName, { delay: 50 });
  cy.byTestID('console-select-menu-list')
    .contains(provisionerFullName, { timeout: 15000 })
    .should('be.visible');
  cy.byTestID('console-select-menu-list').contains(provisionerFullName).click();
  cy.byTestID('pool-dropdown-toggle', { timeout: 30 * SECOND }).should(
    'be.visible'
  );
  cy.byTestID('pool-dropdown-toggle').click();
  cy.byTestID('create-new-pool-button', { timeout: 15 * SECOND }).should(
    'be.visible'
  );
  cy.byTestID(defaultPool, { timeout: 30 * SECOND })
    .should('exist')
    .should('be.visible');
};

export const fillPoolModalForm = (poolType: PoolType, poolName: string) => {
  showAvailablePoolsInSCForm(poolType);
  cy.byTestID('create-new-pool-button').click();
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
  cy.get('[data-test="empty-state-body"]').then(($emptyStateBody) => {
    if ($emptyStateBody.length > 0) {
      cy.wrap($emptyStateBody).should(
        'contain',
        poolMessage(poolName, PoolProgress.CREATED)
      );
    }
  });
  triggerPoolFormFooterAction(PoolProgress.CREATED);
  cy.byTestID('pool-dropdown-toggle').should('contain', poolName);
};

export const checkStoragePoolIsSelectableInSCForm = (poolName: string) => {
  cy.byTestID('pool-dropdown-toggle').should('be.visible');
  cy.byTestID('pool-dropdown-toggle').click();
  cy.byTestID(poolName, { timeout: 15 * SECOND }).should('be.visible');
};

export const fillStoragePoolForm = (poolType: PoolType, poolName: string) => {
  cy.byTestID('type-' + poolType.toLowerCase(), { timeout: 15000 }).should(
    'be.visible'
  );
  cy.byTestID('type-' + poolType.toLowerCase()).click();
  cy.byTestID('new-pool-name-textbox', { timeout: 15000 }).should(
    'not.be.disabled'
  );
  cy.byTestID('new-pool-name-textbox').click();
  cy.byTestID('new-pool-name-textbox').clear();
  cy.byTestID('new-pool-name-textbox').type(poolName, { delay: 50 });
  cy.byTestID('new-pool-name-textbox').should('have.value', poolName);
  cy.byTestID('replica-dropdown').should('be.visible');
  cy.byTestID('replica-dropdown').should('not.be.disabled');
  cy.byTestID('replica-dropdown').click();
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(replicaCount + '-way Replication')
    .should('be.visible');
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(replicaCount + '-way Replication')
    .click();
  cy.byTestID('replica-dropdown').should(
    'contain',
    replicaCount + '-way Replication'
  );
  cy.byTestID('compression-checkbox').should('be.visible');
  cy.byTestID('compression-checkbox').check();
};

export const triggerPoolFormFooterAction = (action: string) => {
  switch (action) {
    case PoolProgress.FAILED:
      cy.byLegacyTestID('modal-try-again-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case PoolProgress.CREATED:
      cy.byLegacyTestID('modal-finish-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case PoolProgress.NOTALLOWED:
      cy.byLegacyTestID('modal-close-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    case PoolProgress.BOUNDED:
      cy.byLegacyTestID('modal-go-to-pvc-list-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    default:
      cy.byLegacyTestID('confirm-action').scrollIntoView();
      cy.byLegacyTestID('confirm-action').should('be.visible', {
        timeout: 30000,
      });
      cy.byLegacyTestID('confirm-action').should('not.be.disabled', {
        timeout: 60000,
      });
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
  cy.exec(`oc delete CephBlockPool ${poolName} -n ${NS}`);
};

export const openStoragePoolKebab = (
  targetPoolName: string,
  isDefaultPool = false
) => {
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type(targetPoolName);
  cy.byTestID('storage-pool-kebab-button').should('have.length', 1);
  if (isDefaultPool) {
    cy.byTestID('storage-pool-kebab-button').should('be.disabled');
  } else {
    cy.byTestID('storage-pool-kebab-button').click();
  }
};

export const deleteStoragePool = (poolName: string) => {
  navigateToStoragePoolList();
  openStoragePoolKebab(poolName);
  cy.byTestActionID('Delete Pool').click();
  cy.contains('Delete Storage Pool', { timeout: 5 * 1000 });
  triggerPoolFormFooterAction('delete');
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type(poolName);
  cy.byTestID('storage-pool-kebab-button').should('have.length', 0);
};
