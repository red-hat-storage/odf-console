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

  afterEach(function () {
    if (this.currentTest?.state === 'failed') return;
    verifyBucketClass();
    deleteBucketClass();
  });

  after(() => {
    config.cleanup();
  });

  it('Create a 1 Tier(Spread) Bucket Class', () => {
    config.tiers = [Tier.SPREAD];
    createBucketClass(config);
  });

  it('Create a 1 Tier(Mirror) Bucket Class', () => {
    config.tiers = [Tier.MIRROR];
    createBucketClass(config);
  });

  it('Create a 2 Tier(Spread, Spread) Bucket Class', () => {
    config.tiers = [Tier.SPREAD, Tier.SPREAD];
    createBucketClass(config);
  });

  it('Create a 2 Tier(Spread, Mirror) Bucket Class', () => {
    config.tiers = [Tier.SPREAD, Tier.MIRROR];
    createBucketClass(config);
  });
});

describe('Tests creation of Namespace Bucket Class', () => {
  const namespaceStoreResources = ['ns1', 'ns2', 'ns3', 'ns4'];
  const config = new NamespaceBucketClassConfig(
    namespaceStoreResources,
    BucketClassType.NAMESPACE
  );

  before(() => {
    namespaceStoreResources.forEach((store) => {
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

  afterEach(function () {
    if (this.currentTest?.state === 'failed') return;
    verifyBucketClass();
    deleteBucketClass();
  });

  after(() => {
    config.cleanup();
  });

  it('Create a Single Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.SINGLE;
    createBucketClass(config);
  });

  it('Create a Multi Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.MULTI;
    createBucketClass(config);
  });

  it('Create a Cache Namespace Bucket Class', () => {
    config.namespacePolicyType = NamespacePolicyType.CACHE;
    createBucketClass(config);
  });
});

describe('Tests form validations on Bucket Class', () => {
  const nameFieldTestId: string = 'bucket-class-name';

  beforeEach(() => {
    // FIX: open the wizard directly so bucket-class-name field exists in DOM.
    // visitBucketClassPage() only navigates to the list page — the wizard
    // must be open for any of these form validation tests to find their elements.
    cy.visit('/odf/object-storage/noobaa.io~v1alpha1~BucketClass');
    cy.contains('button', 'Create Bucket Class').should('be.visible').click();
    cy.byTestID('standard-radio').should('be.visible');
  });

  fieldValidationOnWizardFormsTests(nameFieldTestId, 'Next');
});
