import { fieldValidationOnFormsTests } from '../helpers/formValidations';
import { commonFlows } from '../views/common';
import {
  createStore,
  Providers,
  StoreType,
  testName,
  setupProvider,
} from '../views/store';

describe('Tests creation of Backing Stores', () => {
  afterEach(() => {
    cy.exec(`oc delete backingstore test-bucket -n openshift-storage`);
  });

  beforeEach(() => {
    commonFlows.navigateToObjectStorage();
    cy.byTestID('horizontal-link-Backing Store').first().click();
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

  beforeEach(() => {
    commonFlows.navigateToObjectStorage();
    cy.byTestID('horizontal-link-Backing Store').first().click();
    cy.byTestID('item-create').click();
  });

  fieldValidationOnFormsTests(nameFieldTestId, 'Create', () => {
    setupProvider(Providers.AWS, StoreType.BackingStore);
  });
});
