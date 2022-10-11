import { ODFCommon } from '../views/odf-common';
import { createStore, Providers, testName } from '../views/store';

describe('Tests creation of Backing Stores', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  afterEach(() => {
    cy.exec(`oc delete backingstore test-bucket -n openshift-storage`);
  });

  beforeEach(() => {
    cy.visit('/');
    ODFCommon.visitStorageDashboard();
    cy.byLegacyTestID('horizontal-link-Backing Store').first().click();
    cy.byTestID('item-create').click();
  });

  it('Test creation of AWS backing store', () => {
    createStore(Providers.AWS);
    cy.byTestSelector('details-item-value__Name').contains(testName);
    cy.exec(`oc delete secrets ${testName}-secret -n openshift-storage`);
  });
});
