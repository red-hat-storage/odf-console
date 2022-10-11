import { createBlockPool, deleteBlockPoolFromCli } from '../views/block-pool';

/** @deprecated testcases are moved to odf-console */
xdescribe('Test block pool creation under ODF UI', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  it('Check for a new pool creation', () => {
    createBlockPool();
    deleteBlockPoolFromCli();
  });
});
