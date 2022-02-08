export const ODFCommon = {
  visitStorageDashboard: () => {
    cy.clickNavLink(['Storage', 'Data Foundation']);
  },
  visitStorageSystemList: () => {
    cy.clickNavLink(['Storage', 'Data Foundation']);
    cy.contains('Storage Systems').click();
  },
};

export const MIN = 60000;
