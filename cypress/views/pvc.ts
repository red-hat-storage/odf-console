export const pvc = {
  createPVC: (
    name: string,
    size: string,
    storageClass: string,
    mode: 'Block' | 'Filesystem' = 'Filesystem'
  ) => {
    cy.byTestID('item-create').click();
    cy.byTestID('storageclass-dropdown').click();
    cy.wait(5000);
    cy.get(`#${storageClass}-link`).click();
    cy.byTestID('pvc-name').type(name);
    cy.byTestID('pvc-size').type(size);
    if (mode === 'Block') {
      cy.byTestID('Block-radio-input').click();
    }
    cy.byTestID('create-pvc').click();
    cy.contains('Bound', { timeout: 10000 });
  },
  expandPVC: (expansionSize) => {
    cy.byLegacyTestID('actions-menu-button').click();
    cy.byTestActionID('Expand PVC').click();
    cy.byTestID('pvc-expand-size-input').clear().type(expansionSize);
    cy.byTestID('confirm-action').click();
  },
};
