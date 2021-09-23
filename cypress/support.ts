import { 
  NS,
  ODFCatalogSource,
  OCS_SS,
} from './support/consts';
import './support/selectors';
import './support/login';

declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      install(encrypted?: boolean): Chainable<Element>;
    }
  }
}

Cypress.on('uncaught:exception', () => {
  // don't fail on Cypress' internal errors.
  return false;
});

Cypress.Commands.add('install', () => {
  cy.exec(`oc get storagesystem ${OCS_SS} -n ${NS}`, {
    failOnNonZeroExit: false,
  }).then(({ code }) => {
    if (code !== 0) {
      cy.log('Perform ODF Operator installation and StorageSystem creation');
      cy.log('Create custom catalog source with latest stable image of ODF');
      // Apply CatalogSource.
      cy.exec(`kubectl delete catalogsource ${ODFCatalogSource.metadata.name} -n ${ODFCatalogSource.metadata.namespace}`, { failOnNonZeroExit: false })
      cy.exec(`echo '${JSON.stringify(ODFCatalogSource)}' | kubectl create -f -`);
      cy.log('Search in Operator Hub');
      // Search Operator in Operator Hub.
      cy.clickNavLink(['Operators', 'OperatorHub']);
      cy.byTestID('search-operatorhub').type('Openshift Data Foundation');
      cy.byTestID('odf-operator-odf-catalogsource-openshift-marketplace', { timeout: 60000 }).click();
      cy.log('Subscribe to ODF Operator');
      // Install Operator.
      cy.byLegacyTestID('operator-install-btn').click({ force: true });
      cy.byTestID('Operator recommended Namespace:-radio-input').should('be.checked');
      cy.byTestID('Disable-radio-input').should('be.checked');
      cy.byTestID('Enable-radio-input').click();
      cy.byTestID('install-operator').click({ force: true });
      cy.byTestID('success-icon', { timeout: 4 * 60000 }).should('be.visible');
      cy.log('Create a storage system')
      // Create a storage system.
      cy.get('button').contains("Create StorageSystem").click();
      // Wait for the StorageSystem page to load.
      cy.contains("Create StorageSystem", { timeout: 10 * 1000 }).should("be.visible");
      cy.get('button').contains("Next").click();
      cy.get('input[type="checkbox"]').first().uncheck();
      cy.get('input[type="checkbox"]').first().check();
      cy.get('button').contains("Next").click();
      cy.get('button').contains("Next").click();
      cy.get('button').contains("Create StorageSystem").as('Create StorageSystem Button');
      cy.get('@Create StorageSystem Button').click();
      // Wait for the storage system to be created.
      cy.get('@Create StorageSystem Button', {timeout: 10 * 1000}).should('not.exist');
      cy.log('Check if storage system was created')
      cy.clickNavLink(['Operators', 'Installed Operators'])
      cy.byLegacyTestID('item-filter').type("Openshift Data Foundation");
      cy.byTestRows('resource-row').get('td').first().click();
      cy.byLegacyTestID('horizontal-link-Storage System').click();
      cy.byLegacyTestID('item-filter').type(`${OCS_SS}`);
      cy.get('td[role="gridcell"]', {timeout: 5 * 60000}).contains("Available");
    } else {
      cy.log(' ocs-storagecluster-storagesystem is present, proceeding without installation.');
    }
  });
});
