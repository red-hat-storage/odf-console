export const ODFCommon = {
  visitStorageDashboard: () => {
    cy.clickNavLink(['Storage', 'Data Foundation']);
  },
  visitStorageCluster: () => {
    cy.clickNavLink(['Storage', 'Storage cluster']);
  },
};

export const MIN = 60000;
