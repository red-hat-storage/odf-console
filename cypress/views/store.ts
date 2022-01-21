export enum Providers {
  AWS = 'AWS S3',
  AZURE = 'Azure Blob',
  S3 = 'S3 Compatible',
  PVC = 'PVC',
}

// Used to identify data-test ids, values are based on data-test fields
export enum StoreType {
  BackingStore = 'backingstore',
  NamespaceStore = 'namespacestore',
}

export const testName = 'test-bucket';

const inputCustomSecrets = (storeType: StoreType) => {
  cy.log('Set custom secrets');
  cy.byTestID('switch-to-creds').click();
  cy.byTestID(`${storeType}-access-key`).type('my_dummy_test_key');
  cy.byTestID(`${storeType}-secret-key`).type('my_dummy_sec_key');
  cy.byTestID(`${storeType}-target-bucket`).type('my_dummy_target');
};

const setupProvider = (provider: Providers, storeType: StoreType) => {
  cy.byTestID(`${storeType}-provider`).click();
  cy.log(`Setting up ${provider} provider`);
  cy.byTestDropDownMenu(provider).click();
  switch (provider) {
    case Providers.AWS:
      cy.byTestID(`${storeType}-aws-region-dropdown`).click();
      cy.byTestDropDownMenu('us-east-1').click();
      break;
    case Providers.S3:
      const ENDPOINT = 'http://test-endpoint.com';
      cy.byTestID(`${storeType}-s3-endpoint`).type(ENDPOINT);
      break;
    default:
      break;
  }
  inputCustomSecrets(storeType);
};

export const createStore = (
  provider: Providers,
  storeType: StoreType = StoreType.BackingStore
) => {
  cy.log(`Creating ${storeType}`);
  cy.byTestID(`${storeType}-name`).type(testName);
  setupProvider(provider, storeType);
  cy.byTestID(`${storeType}-create-button`).click();
};
