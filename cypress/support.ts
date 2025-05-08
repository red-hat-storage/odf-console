/* eslint-disable cypress/require-data-selectors */
import {
  CLUSTER_NAMESPACE,
  STORAGE_SYSTEM_NAME,
  OCS_SC_STATE,
  ODF_OPERATOR_NAME,
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
      cy.clickNavLink(['Operators', 'Installed Operators']);
      cy.byLegacyTestID('item-filter').type(ODF_OPERATOR_NAME);
      // data-test-operator-row="OpenShift Data Foundation"
      cy.byTestOperatorRow(ODF_OPERATOR_NAME).click();
      cy.byLegacyTestID('horizontal-link-Storage System').click();
      cy.byTestID('item-create').click();

      // Wait for the StorageSystem page to load.
      cy.contains('Create StorageSystem', { timeout: 15 * SECOND }).should(
        'be.visible'
      );

      // Uncomment next line only if the cluster has enough resources.
      // cy.get('label[for="enable-nfs"]').click();

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
        .contains('Create StorageSystem')
        .as('Create StorageSystem Button');
      cy.get('@Create StorageSystem Button').click();
      // Wait for the storage system to be created.
      cy.get('@Create StorageSystem Button', { timeout: 10 * SECOND }).should(
        'not.exist'
      );

      cy.log('Check if storage system was created and is listed as expected.');
      cy.clickNavLink(['Storage', 'Data Foundation']);
      cy.byLegacyTestID('horizontal-link-Storage Systems').click();
      cy.byLegacyTestID('item-filter').type(STORAGE_SYSTEM_NAME);
      cy.get('a').contains(STORAGE_SYSTEM_NAME);
      cy.get('[data-label="status"]').contains('Ready', {
        timeout: 25 * MINUTE,
      });
      // Verify that the OCS SC is in READY state.
      cy.exec(OCS_SC_STATE, { timeout: 25 * MINUTE });
      cy.visit('/');
    } else {
      cy.log(
        ' ocs-storagecluster is present, proceeding without installation.'
      );
    }
  });
});
