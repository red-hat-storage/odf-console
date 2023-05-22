import { POOL_PROGRESS } from '../constants/storage-pool-const';
import { NS } from '../utils/consts';
import { ODFCommon } from '../views/odf-common';

// Pool var
export const poolName: string = 'example.pool';
export const replicaCount: string = '2';
export const volumeType: string = 'ssd';
export const scName: string = 'testing-sc';

export const poolMessage: {
  [key in POOL_PROGRESS]?: string;
} = {
  [POOL_PROGRESS.FAILED]: `Pool "${poolName}" already exists`,
  [POOL_PROGRESS.CREATED]: `Pool ${poolName} was successfully created`,
  [POOL_PROGRESS.NOTALLOWED]:
    "Pool management tasks are not supported for default pool and ODF's external mode.",
  [POOL_PROGRESS.BOUNDED]: `${poolName} cannot be deleted. When a pool is bounded to PVC it cannot be deleted. Please detach all the resources from StorageClass(es):`,
};

export const navigateToBlockPool = () => {
  ODFCommon.visitStorageDashboard();
  cy.byLegacyTestID('horizontal-link-Storage Systems').click();
  cy.byLegacyTestID('item-filter').type('ocs-storagecluster-storagesystem');
  cy.byTestRows('resource-row').get('td a').first().click();
  cy.byTestID('horizontal-link-BlockPools').click();
};

export const populateBlockPoolForm = () => {
  cy.byTestID('new-pool-name-textbox').type(poolName);
  cy.byTestID('replica-dropdown').click();
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(`${replicaCount}-way Replication`)
    .click();
  cy.byTestID('volume-type-dropdown').click();
  cy.byTestID('volume-type-dropdown-item')
    .contains(volumeType.toLocaleUpperCase())
    .click();
  cy.byTestID('compression-checkbox').check();
};

export enum Actions {
  created = 'created',
  failed = 'failed',
  notAllowed = 'notAllowed',
  bound = 'bounded',
}

export const verifyFooterActions = (action: string) => {
  switch (action) {
    case Actions.failed:
      cy.log('Check try-again-action and finish-action are enabled');
      cy.byLegacyTestID('modal-try-again-action').should('be.visible');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case Actions.created:
      cy.log('Check finish-action is enabled');
      cy.byLegacyTestID('modal-finish-action').click();
      break;
    case Actions.notAllowed:
      cy.log('Check close-action is enabled');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    case Actions.bound:
      cy.log('Check go-to-pvc-list-action and close-action are enabled');
      cy.byLegacyTestID('modal-go-to-pvc-list-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    default:
      cy.log(`Invoke ${action} action`);
      cy.byLegacyTestID('confirm-action').scrollIntoView().click();
  }
};

export const verifyBlockPoolJSON = (
  compressionEnabled: boolean = true,
  replica: string = replicaCount
) =>
  cy.exec(`oc get cephBlockPool ${poolName} -n  ${NS} -o json`).then((res) => {
    const blockPool = JSON.parse(res.stdout);
    expect(blockPool.spec?.replicated?.size).to.equal(Number(replica));
    expect(blockPool.spec?.compressionMode).to.equal(
      compressionEnabled ? 'aggressive' : 'none'
    );
    expect(blockPool.spec?.parameters?.compression_mode).to.equal(
      compressionEnabled ? 'aggressive' : 'none'
    );
    expect(blockPool.spec?.deviceClass).to.equal(volumeType);
  });

export const createBlockPool = () => {
  cy.byTestID('item-create').click();
  populateBlockPoolForm();
  verifyFooterActions('create');
  cy.log('Verify a new block pool creation');
  cy.byTestID('status-text').contains('Ready');
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
  cy.byLegacyTestID('item-filter').clear().type(targetPoolName);
  cy.log('Only one resource should be present after filtering');
  cy.byTestID('kebab-button').should('have.length', 1);
  if (isDefaultPool)
    cy.byTestID('kebab-button').first().find('button').should('be.disabled');
  else cy.byTestID('kebab-button').first().click();
};
