import { blockPoolCRUDOperations, verifyBlockPoolJSON } from '../views/block-pool';

describe('Test block pool creation under ODF console UI', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    blockPoolCRUDOperations.deleteBlockPoolFromCli();
    cy.logout();
  });

  it('Check for a new block pool creation', () => {
    blockPoolCRUDOperations.createBlockPool();
    verifyBlockPoolJSON();
  });
});
