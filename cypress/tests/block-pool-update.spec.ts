import {
  blockPoolProps,
  CompressionMode,
  blockPoolCRUDOperations,
  verifyBlockPoolJSON,
  BlockPoolPros
} from '../views/block-pool';

export const replicaSize: string = '3';

describe('Test block pool update under ODF UI', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    // custom block pool creation
    blockPoolCRUDOperations.createBlockPool();
  });

  after(() => {
    blockPoolCRUDOperations.deleteBlockPoolFromCli();
    cy.logout();
  });

  it('Successfully updating the custom block pool', () => {
    cy.log('Updating block pool replica size to 3 and disable compression');
    const props: BlockPoolPros = {
      poolName: blockPoolProps.poolName,
      volumeType: blockPoolProps.volumeType,
      replicaSize: replicaSize,
      compressionMode: CompressionMode.DISABLED
    }
    blockPoolCRUDOperations.editBlockPool(props);
  });

  it('Ensure edit default block pool is blocked from UI', () => {
    cy.log('Click edit kebab action');
    cy.byLegacyTestID('kebab-button').last().should('be.disabled');
  });
});
