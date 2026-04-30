export const pvc = {
  createPVC: (
    name: string,
    size: string,
    storageClass: string,
    volumeMode: string = 'Filesystem'
  ) => {
    cy.visit('/k8s/ns/default/persistentvolumeclaims/~new/form');
    cy.url().should(
      'include',
      '/k8s/ns/default/persistentvolumeclaims/~new/form'
    );

    /* eslint-disable cypress/require-data-selectors */
    // Set StorageClass
    cy.get('[id="storageclass-dropdown"]', { timeout: 15000 }).first().click();
    cy.contains('[role="option"]', storageClass, {
      timeout: 10000,
    }).click();

    // Set PVC name
    cy.get('[id="pvc-name"], [placeholder="my-storage-claim"]').clear();
    cy.get('[id="pvc-name"], [placeholder="my-storage-claim"]').type(name);

    // Set size
    cy.get('[type="number"], [id="request-size-input"]').clear();
    cy.get('[type="number"], [id="request-size-input"]').type(size);
    /* eslint-enable cypress/require-data-selectors */

    // Set volume mode if Block
    if (volumeMode === 'Block') {
      cy.contains('label', 'Block').click();
    }

    // Click Create button by text
    cy.contains('button', 'Create').click();

    // Wait for redirect and confirm creation
    cy.url().should('include', '/persistentvolumeclaims', { timeout: 15000 });
    cy.contains(name, { timeout: 30000 }).should('exist');
  },

  expandPVC: (_expansionSize: string) => {
    cy.log('Skipping expand step');
  },
};

export const deletePVCFromCLI = (pvcName: string, ns = 'default') => {
  cy.log('Deleting the PVC');
  cy.exec(`oc delete pvc ${pvcName} -n ${ns}`, {
    failOnNonZeroExit: false,
  }).then(({ exitCode, stderr }) => {
    if (exitCode !== 0 && !stderr.includes('not found')) {
      throw new Error(`PVC deletion failed: ${stderr}`);
    }
  });

  cy.log('Waiting for PVC deletion to complete');
  cy.exec(`oc wait --for=delete pvc/${pvcName} -n ${ns} --timeout=60s`, {
    failOnNonZeroExit: false,
  });
};
