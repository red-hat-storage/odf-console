/* eslint-disable cypress/require-data-selectors */
import {
  CLUSTER_NAMESPACE,
  STORAGE_SYSTEM_NAME,
  OCS_SC_STATE,
  SECOND,
  MINUTE,
} from './consts';
import './support/selectors';
import './support/login';

const disableIrrelevantLogging = () => {
  // Disable the default behavior of logging all XMLHttpRequests and fetches.
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false });
};

before(() => {
  disableIrrelevantLogging(); // Required as 'before' actions precede 'beforeEach' actions.
});

beforeEach(() => {
  disableIrrelevantLogging();
  cy.login();
  cy.visit('/');
  cy.install();
});

declare global {
  namespace Cypress {
    interface Chainable {
      install(encrypted?: boolean): Chainable<Element>;
    }
  }
}

Cypress.on('uncaught:exception', () => {
  // don't fail on Cypress' internal errors.
  return false;
});

Cypress.Cookies.debug(true);

Cypress.Commands.add('install', () => {
  cy.exec(
    `oc get storagecluster ${STORAGE_SYSTEM_NAME} -n ${CLUSTER_NAMESPACE}`,
    {
      failOnNonZeroExit: false,
    }
  ).then(({ code }) => {
    if (code !== 0) {
      cy.clickNavLink(['Storage', 'Storage cluster']);
      // Clicks create Data Foundation button
      cy.byTestID('configure-data-foundation').click();
      // Clicks create StorageCluster tile
      cy.byTestID('create-storage-cluster').click();
      cy.byTestID('create-wizard-empty-state').should('exist');
      cy.byTestID('create-wizard-empty-state').should('not.exist');
      cy.get('button').contains('Next').click();
      // @TODO: Do we still want to uncheck the already unchecked 'Taint nodes' checkbox?
      // If yes, we should scroll down (needed after adding the performance profile selection)
      // and then scroll up again to still be able to select nodes
      // (or put this action after nodes' selection).
      //cy.get('input[type="checkbox"]').first().uncheck();

      cy.get('table').get('input[type="checkbox"]').first().check();
      cy.get('button').contains('Next').click();
      cy.get('button').contains('Next').click();
      cy.get('button')
        .contains('Create storage system')
        .as('Create storage system Button');
      cy.get('@Create storage system Button').click();
      // Wait for the storage system to be created.
      cy.get('@Create storage system Button', { timeout: 10 * SECOND }).should(
        'not.exist'
      );

      cy.log('Check if storage system was created and is listed as expected.');
      cy.clickNavLink(['Storage', 'Storage cluster']);
      // Verify that the OCS SC is in READY state.
      cy.exec(OCS_SC_STATE, { timeout: 25 * MINUTE });
      cy.byTestID('success-icon', {
        timeout: 25 * MINUTE,
      })
        .first()
        .should('be.visible');
      cy.get('[data-label="status"]').contains('Ready', {});
      cy.visit('/');
    } else {
      cy.log(
        ' ocs-storagecluster is present, proceeding without installation.'
      );
    }
  });
});
