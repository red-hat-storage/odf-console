/* eslint-disable cypress/require-data-selectors */
import {
  CLUSTER_NAMESPACE,
  STORAGE_SYSTEM_NAME,
  OCS_SC_STATE,
  ODF_OPERATOR_NAME,
} from './consts';
import './support/selectors';
import './support/login';
import { commandPoll } from './views/common';

declare global {
  namespace Cypress {
    interface Chainable {
      install(encrypted?: boolean): Chainable<Element>;
      enableToolboxPod(): void;
    }
  }
}

Cypress.on('uncaught:exception', () => {
  // don't fail on Cypress' internal errors.
  return false;
});

Cypress.Cookies.debug(true);

Cypress.Cookies.defaults({
  preserve: ['openshift-session-token', 'csrf-token'],
});

Cypress.Commands.add('install', () => {
  cy.exec(
    `oc get storagesystem ${STORAGE_SYSTEM_NAME} -n ${CLUSTER_NAMESPACE}`,
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
      cy.contains('Create StorageSystem', { timeout: 10 * 1000 }).should(
        'be.visible'
      );
      cy.get('button').contains('Next').click();
      // @TODO: Do we still want to uncheck the already unchecked 'Taint nodes' checkbox?
      // If yes, we should scroll down (needed after adding the performance profile selection)
      // and then scroll up again to still be able to select nodes
      // (or put this action after nodes' selection).
      //cy.get('input[type="checkbox"]').first().uncheck();

      cy.get('table').get('input[type="checkbox"]').first().check();
      cy.get('button').contains('Next').click();
      cy.get('button').contains('Next').click();
      cy.get('button').contains('Next').click();
      cy.get('button')
        .contains('Create StorageSystem')
        .as('Create StorageSystem Button');
      cy.get('@Create StorageSystem Button').click();
      // Wait for the storage system to be created.
      cy.get('@Create StorageSystem Button', { timeout: 10 * 1000 }).should(
        'not.exist'
      );

      cy.log('Check if storage system was created and is listed as expected.');
      cy.clickNavLink(['Storage', 'Data Foundation']);
      cy.byLegacyTestID('horizontal-link-Storage Systems').click();
      cy.byLegacyTestID('item-filter').type(STORAGE_SYSTEM_NAME);
      cy.get('a').contains(STORAGE_SYSTEM_NAME);
      cy.get('td[id="status"]', { timeout: 5 * 60000 }).contains('Available', {
        timeout: 5 * 60000,
      });
      // Verify that the OCS SC is in READY state.
      cy.exec(OCS_SC_STATE, { timeout: 25 * 60000 });
    } else {
      cy.log(
        ' ocs-storagecluster-storagesystem is present, proceeding without installation.'
      );
    }
  });
});

Cypress.Commands.add('enableToolboxPod', () => {
  cy.exec(
    `oc patch ocsinitialization ocsinit -n openshift-storage --type json --patch  '[{ "op": "replace", "path": "/spec/enableCephTools", "value": true }]'`
  );
  commandPoll(
    'oc get pod -l "app=rook-ceph-tools" -n openshift-storage',
    null,
    false,
    200,
    0
  );
  cy.exec(
    `oc wait --for=condition=ready pod -l "app=rook-ceph-tools" -n openshift-storage`
  );
});
