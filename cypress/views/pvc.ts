import { MINUTE } from '../consts';
import { app } from '../support/pages/app';

export const pvc = {
  createPVC: (
    name: string,
    size: string,
    storageClass: string,
    volumeMode: string = 'Filesystem'
  ) => {
    cy.byTestID('item-create').click();
    cy.byTestID('storageclass-dropdown').click();
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get(`#${storageClass}-link`).click();
    cy.byTestID('pvc-name').type(name);
    cy.byTestID('pvc-size').type('{moveToEnd}');
    cy.byTestID('pvc-size').type(size);
    if (volumeMode === 'Block') {
      // eslint-disable-next-line cypress/require-data-selectors
      cy.get('#volumeMode-Block').click();
    }

    cy.byTestID('create-pvc').click();
    app.waitForLoad();
    cy.byTestID('resource-status', { timeout: 3 * MINUTE }).contains('Bound', {
      timeout: 3 * MINUTE,
    });
  },

  expandPVC: (expansionSize: string) => {
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
  cy.exec(`oc delete pvc ${pvcName} -n ${ns} --ignore-not-found=true`, {
    failOnNonZeroExit: false,
    timeout: 120000,
  }).then(({ exitCode, stderr }) => {
    if (exitCode !== 0 && !stderr.includes('not found')) {
      throw new Error(`PVC deletion failed: ${stderr}`);
    }
  });

  cy.log('Waiting for PVC deletion to complete');
  cy.exec(`oc wait --for=delete pvc/${pvcName} -n ${ns} --timeout=90s`, {
    failOnNonZeroExit: false,
    timeout: 100000,
  });
};
