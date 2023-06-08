import { fieldValidationOnFormsTests } from '../helpers/formValidations';
import { commonFlows } from '../views/common';
import { MIN } from '../views/odf-common';
import {
  createStore,
  Providers,
  setupProvider,
  StoreType,
  testName,
} from '../views/store';

describe('Tests creation of Namespace Stores', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  afterEach(() => {
    cy.byTestID('kebab-button').click();
    cy.log('Deleting namespace store');
    cy.byTestActionID('Delete Namespace Store').click();
    cy.byTestID('delete-action').click();

    // We are deleting above but this command will ensure the resource's complete termination
    cy.exec(
      `oc delete namespacestores ${testName} -n openshift-storage --wait`,
      { timeout: 5 * MIN, failOnNonZeroExit: false }
    );
    cy.log('Deleting secrets');
    cy.exec(`oc delete secrets ${testName}-secret -n openshift-storage --wait`);
  });

  beforeEach(() => {
    cy.visit('/');
    commonFlows.navigateToObjectStorage();
    cy.byLegacyTestID('horizontal-link-Namespace Store').first().click();
    cy.byTestID('item-create').click();
  });

  const checkSecret = (tName: string) => {
    cy.exec(`oc get secrets ${tName}-secret -n openshift-storage`, {
      failOnNonZeroExit: true,
      log: true,
      timeout: 2 * MIN,
    })
      .its('code')
      .should('eq', 0);
  };
  it('Test creation of AWS namespace store', () => {
    createStore(Providers.AWS, StoreType.NamespaceStore);
    cy.byLegacyTestID('resource-title').contains(testName);
    checkSecret(testName);
  });

  it('Test creation of Azure namespace store', () => {
    createStore(Providers.AZURE, StoreType.NamespaceStore);
    cy.byLegacyTestID('resource-title').contains(testName);
    checkSecret(testName);
  });

  it('Test creation of S3 Endpoint Type', () => {
    createStore(Providers.S3, StoreType.NamespaceStore);
    cy.byLegacyTestID('resource-title').contains(testName);
    checkSecret(testName);
  });
});

describe('Tests form validations on Namespace Stores', () => {
  const nameFieldTestId: string = `${StoreType.NamespaceStore}-name`;

  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  beforeEach(() => {
    cy.visit('/');
    commonFlows.navigateToObjectStorage();
    cy.byLegacyTestID('horizontal-link-Namespace Store').first().click();
    cy.byTestID('item-create').click();
  });

  fieldValidationOnFormsTests(nameFieldTestId, 'Create', () => {
    setupProvider(Providers.AWS, StoreType.NamespaceStore);
  });
});
