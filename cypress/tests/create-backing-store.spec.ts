import { fieldValidationOnFormsTests } from '../helpers/formValidations';
import { ODFCommon } from '../views/odf-common';
import {
  createStore,
  Providers,
  StoreType,
  testName,
  setupProvider,
} from '../views/store';

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

describe('Tests form validations on Backing Stores', () => {
  const nameFieldTestId: string = `${StoreType.BackingStore}-name`;

  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  beforeEach(() => {
    cy.visit('/');
    ODFCommon.visitStorageDashboard();
    cy.byLegacyTestID('horizontal-link-Backing Store').first().click();
    cy.byTestID('item-create').click();
  });

  fieldValidationOnFormsTests(nameFieldTestId, 'Create', () => {
    setupProvider(Providers.AWS, StoreType.BackingStore);
  });
});
