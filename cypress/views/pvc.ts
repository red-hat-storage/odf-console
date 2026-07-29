export const pvc = {
  createPVC: (
    name: string,
    size: string,
    storageClass: string,
    mode: 'Block' | 'Filesystem' = 'Filesystem'
  ) => {
    cy.byTestID('item-create').click();
    cy.byTestID('storageclass-dropdown').click();
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get(`#${storageClass}-link`).click();
    cy.byTestID('pvc-name').type(name);
    cy.byTestID('pvc-size').type('{moveToEnd}');
    cy.byTestID('pvc-size').type(size);
    if (mode === 'Block') {
      cy.byTestID('Block-radio-input').click();
    }
    cy.byTestID('create-pvc').click();
    cy.byTestID('resource-status').contains('Bound', { timeout: 50000 });
  },
  expandPVC: (expansionSize) => {
    cy.byLegacyTestID('actions-menu-button').click();
    cy.byTestActionID('Expand PVC').click();
    cy.byTestID('pvc-expand-size-input').clear();
    cy.byTestID('pvc-expand-size-input').type('{moveToEnd}');
    cy.byTestID('pvc-expand-size-input').type(expansionSize);
    cy.byTestID('confirm-action').click();
  },
};

export const deletePVCFromCLI = (pvcName: string, ns = 'default') => {
  cy.log('Deleting the PVC');
  cy.exec(`oc delete pvc ${pvcName} -n ${ns}`, {
    failOnNonZeroExit: false,
  }).then((result) => {
    if (result.code !== 0 && !result.stderr.includes('not found')) {
      throw new Error(`PVC deletion failed: ${result.stderr}`);
    }
  });
};
