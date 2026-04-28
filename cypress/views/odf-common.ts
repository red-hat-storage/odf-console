export const ODFCommon = {
  visitStorageDashboard: () => {
    cy.visit('/odf/overview');
    cy.url().should('include', '/odf/overview');
    cy.byTestID('nav', { timeout: 30000 }).should('be.visible');
  },
  visitStorageCluster: () => {
    cy.visit('/odf/storage-cluster');
    cy.url().should('include', '/odf/storage-cluster');
    cy.byTestID('nav', { timeout: 30000 }).should('be.visible');
  },
};

export const MIN = 60000;
