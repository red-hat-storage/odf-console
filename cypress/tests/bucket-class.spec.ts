import { fieldValidationOnWizardFormsTests } from '../helpers/formValidations';
import {
  createBucketClass,
  Tier,
  BucketClassType,
  StandardBucketClassConfig,
  verifyBucketClass,
  NamespaceBucketClassConfig,
  NamespacePolicyType,
  deleteBucketClass,
  visitBucketClassPage,
} from '../views/bc';

describe('Tests creation of Standard Bucket Class', () => {
  const backingStoreResources = [
    'test-store1',
    'test-store2',
    'test-store3',
    'test-store4',
  ];
  const config = new StandardBucketClassConfig(
    backingStoreResources,
    BucketClassType.STANDARD
  );

  before(() => {
    backingStoreResources.forEach((store) => {
      cy.exec(
        `oc delete backingstore ${store} -n openshift-storage --ignore-not-found`,
        { failOnNonZeroExit: false }
      );
    });
    config.setup();
  });

  beforeEach(() => {
    visitBucketClassPage();
  });

  afterEach(() => {
    deleteBucketClass();
  });

  after(() => {
    config.cleanup();
  });

  it('Create a 1 Tier(Spread) Bucket Class', () => {
    config.tiers = [Tier.SPREAD];
    createBucketClass(config);
    verifyBucketClass();
  });

  it('Create a 1 Tier(Mirror) Bucket Class', () => {
    config.tiers = [Tier.MIRROR];
    createBucketClass(config);
    verifyBucketClass();
  });

  it('Create a 2 Tier(Spread, Spread) Bucket Class', () => {
    config.tiers = [Tier.SPREAD, Tier.SPREAD];
    createBucketClass(config);
    verifyBucketClass();
  });

  it('Create a 2 Tier(Spread, Mirror) Bucket Class', () => {
    config.tiers = [Tier.SPREAD, Tier.MIRROR];
    createBucketClass(config);
    verifyBucketClass();
  });
});

describe('Tests creation of Namespace Bucket Class', () => {
  const nsResources = ['ns1', 'ns2', 'ns3', 'ns4'];
  const config = new NamespaceBucketClassConfig(
    nsResources,
    BucketClassType.NAMESPACE
  );

  before(() => {
    nsResources.forEach((store) => {
      cy.exec(
        `oc delete namespacestore ${store} -n openshift-storage --ignore-not-found`,
        { failOnNonZeroExit: false }
      );
    });
    config.setup();
  });

  beforeEach(() => {
    visitBucketClassPage();
  });

  afterEach(() => {
    deleteBucketClass();
  });

  after(() => {
    config.cleanup();
  });

  it('Create a Single Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.SINGLE;
    createBucketClass(config);
    verifyBucketClass();
  });

  it('Create a Multi Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.MULTI;
    createBucketClass(config);
    verifyBucketClass();
  });

  it('Create a Cache Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.CACHE;
    createBucketClass(config);
    verifyBucketClass();
  });
});

describe('Tests form validations on Bucket Class', () => {
  const nameFieldTestId: string = 'bucket-class-name';

  beforeEach(() => {
    visitBucketClassPage();

    cy.byTestID('item-create').click();
    cy.byTestID('standard-radio', { timeout: 15000 }).should('be.visible');
  });

  fieldValidationOnWizardFormsTests(nameFieldTestId, 'Next');
});
