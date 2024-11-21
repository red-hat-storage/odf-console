import {
  CEPH_DEFAULT_BLOCK_POOL_NAME,
  PoolProgress,
} from '../constants/storage-pool-const';
import { STORAGE_SYSTEM_NAME } from '../consts';
import { app } from '../support/pages/app';
import { NS } from '../utils/consts';
import { ODFCommon } from '../views/odf-common';
import { triggerPoolFormFooterAction } from './storage-pool';

// Pool var
export const poolName: string = 'example.pool';
export const replicaCount: string = '2';
export const scName: string = 'testing-sc';

export const poolMessage: {
  [key in PoolProgress]?: string;
} = {
  [PoolProgress.FAILED]: `Pool "${poolName}" already exists`,
  [PoolProgress.CREATED]: `Pool ${poolName} was successfully created`,
  [PoolProgress.NOTALLOWED]:
    "Pool management tasks are not supported for default pool and ODF's external mode.",
  [PoolProgress.BOUNDED]: `${poolName} cannot be deleted. When a pool is bounded to PVC it cannot be deleted. Please detach all the resources from StorageClass(es):`,
};

export const navigateToBlockPool = () => {
  ODFCommon.visitStorageDashboard();
  cy.byLegacyTestID('horizontal-link-Storage Systems').click();
  cy.byLegacyTestID('item-filter').type(STORAGE_SYSTEM_NAME);
  cy.byTestRows('resource-row').get('td a').first().click();
  cy.byTestID('horizontal-link-BlockPools').click();
};

export const populateBlockPoolForm = () => {
  cy.byTestID('new-pool-name-textbox').clear();
  cy.byTestID('new-pool-name-textbox').type(poolName);
  cy.byTestID('replica-dropdown').click();
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(`${replicaCount}-way Replication`)
    .click();
  cy.byTestID('compression-checkbox').check();
};

export const verifyBlockPoolJSON = (
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

export const createBlockPool = () => {
  cy.byTestID('item-create').click();
  populateBlockPoolForm();
  triggerPoolFormFooterAction('create');
  app.waitForLoad();
  cy.log('Verify a new block pool creation');
  cy.byTestID('status-text').should('contain', 'Ready', { timeout: 2 * 60000 });
  verifyBlockPoolJSON();
};

export const deleteBlockPoolFromCLI = () => {
  cy.log('Deleting a pool');
  cy.exec(`oc delete CephBlockPool ${poolName} -n ${NS}`);
};

export const openBlockPoolKebab = (
  targetPoolName: string,
  isDefaultPool = false
) => {
  cy.byLegacyTestID('item-filter').clear();
  cy.byLegacyTestID('item-filter').type(targetPoolName);
  cy.log('Only one resource should be present after filtering');
  cy.byTestID('kebab-button').should('have.length', 1);
  if (isDefaultPool) cy.byTestID('kebab-button').should('be.disabled');
  else cy.byTestID('kebab-button').click();
};
