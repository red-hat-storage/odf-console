import { NS } from '../utils/consts';
import { modal } from '../../cypress/support/modal';
import { commonFlows, commandPoll } from './common';


// enums
enum Actions {
  BOUNDED = 'bounded',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
};

enum VolumeType {
  SSD = 'ssd',
  HDD = 'hdd'
};

export enum CompressionMode {
  ENABLED = 'enabled',
  DISABLED = 'disabled'
};

// intialize block pool object
export const defaultPoolName = "ocs-storagecluster-cephblockpool";

export type BlockPoolPros = {
  poolName: string;
  replicaSize: string;
  volumeType: VolumeType;
  compressionMode:CompressionMode;
};

export const blockPoolProps: BlockPoolPros = {
  poolName: 'example.pool',
  replicaSize: '2',
  volumeType: VolumeType.SSD,
  compressionMode: CompressionMode.ENABLED
}

const poolMessage: {
    [key in Actions]?: string;
} = {
    [Actions.BOUNDED]: `${blockPoolProps.poolName} cannot be deleted. When a pool is bounded to PVC it cannot be deleted. Please detach all the resources from StorageClass(es):`,
};

export const navigateToBlockPoolListPage = () => {
  cy.log('Navigate to block pool list page');
  commonFlows.navigateToOcsOverview();
  cy.byLegacyTestID('horizontal-link-BlockPools').click();
};

const invokeActions = (action: string) => {
  switch(action) {
    case Actions.CREATE:
    case Actions.UPDATE:
    case Actions.DELETE:
      cy.log(`Invoke ${action} action`);
      cy.byLegacyTestID('confirm-action')
        .scrollIntoView()
        .click();
      break;
    case Actions.BOUNDED:
      cy.log('Check go-to-pvc-list-action and close-action are enabled');
      cy.byLegacyTestID('modal-go-to-pvc-list-action').should('be.visible');
      cy.byLegacyTestID('modal-close-action').click();
      break;
    default:
      cy.contains("Unsupported block pool action").should('not.exist')
  };
};

const populateBlockPoolForm = (props: BlockPoolPros = blockPoolProps, isEdit=false) => {
  if (!isEdit) {
    // block pool name
    cy.byTestID('new-pool-name-textbox').type(props.poolName);
    // device class type SSD / HDD
    cy.byTestID('volume-type-dropdown').click();
    cy.byTestID('volume-type-dropdown-item')
      .contains(props.volumeType.toLocaleUpperCase())
      .click();
  }
  // replica size 2 / 3
  cy.byTestID('replica-dropdown').click();
  cy.byLegacyTestID('replica-dropdown-item')
    .contains(`${props.replicaSize}-way Replication`)
    .click();
  // compression enable / disable
  props.compressionMode === CompressionMode.ENABLED ? 
    cy.byTestID('compression-checkbox').check() : cy.byTestID('compression-checkbox').uncheck();
};

export const verifyBlockPoolJSON = (props: BlockPoolPros = blockPoolProps, deleted=false) => {
  // assert using block pool CR
  const cmd = `oc get cephBlockPool ${props.poolName} -n  ${NS} -o json`;
  if (deleted) {
    // verify block pool deletion
    commandPoll(cmd, "", false);
    return;
  };
  // verify block pool creation / update
  cy.exec(cmd).then((res) => {
    const blockPool = JSON.parse(res.stdout);
    const mode = props.compressionMode === CompressionMode.ENABLED ? 'aggressive' : 'none';
    expect(blockPool.spec?.replicated?.size).equal(Number(props.replicaSize));
    expect(blockPool.spec?.compressionMode).equal(mode);
    expect(blockPool.spec?.parameters?.compression_mode).equal(mode);
    expect(blockPool.spec?.deviceClass).equal(props.volumeType);
  });
};

export const blockPoolCRUDOperations = {
  createBlockPool: (props: BlockPoolPros = blockPoolProps) => {
    navigateToBlockPoolListPage();

    cy.log('Creating a new block pool');
    cy.byTestID('item-create').click();
    populateBlockPoolForm(props);
    invokeActions('create');

    cy.log('Verify a new block pool creation');
    cy.byTestID('status-text').contains('Ready');

    cy.log('Redirecting to block pool list page');
    cy.byLegacyTestID('breadcrumb-link-1').click();
  },

  deleteBlockPool: (isPVCBounded: boolean=false, scName?: string) => {

    isPVCBounded && navigateToBlockPoolListPage();

    cy.log('Deleting a block pool');
    cy.byLegacyTestID('kebab-button')
      .first()
      .click();
    cy.byTestActionID('Delete BlockPool').click();

    cy.log('Verify block pool deletion modal');
    modal.modalTitleShouldContain('Delete BlockPool');
    if(isPVCBounded) {
      cy.log('Verify unsuccessful block pool deletion');
      cy.byTestID('pool-bound-message').contains(poolMessage[Actions.BOUNDED]);
      cy.byTestID('pool-storage-classes').contains(scName);
      invokeActions(Actions.BOUNDED);
    } else {
      cy.log('Verify successful block pool deletion');
      invokeActions('delete');
    };
  },

  editBlockPool: (props: BlockPoolPros) => {
    cy.log('Updating a pool from UI');
    cy.byLegacyTestID('kebab-button')
      .first()
      .click();
    cy.byTestActionID('Edit BlockPool').click();

    cy.log('Verify block pool edit modal');
    modal.modalTitleShouldContain('Edit BlockPool');
    populateBlockPoolForm(props, true);
    invokeActions('update');

    cy.log('Verifying block pool updation');
    verifyBlockPoolJSON(props);
  },

  deleteBlockPoolFromCli: (poolName: string=blockPoolProps.poolName) => {
    cy.log('Deleting a pool from CLI');
    cy.exec(`oc delete CephBlockPool ${poolName} -n ${NS}`);
  },
};
