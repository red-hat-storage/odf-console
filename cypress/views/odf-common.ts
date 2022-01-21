export const ODFCommon = {
  visitStorageDashboard: () => {
    cy.clickNavLink(['Storage', 'OpenShift Data Foundation']);
  },
  visitStorageSystemList: () => {
    cy.clickNavLink(['Storage', 'OpenShift Data Foundation']);
    cy.contains('Storage Systems').click();
  },
};

export const MIN = 60000;
