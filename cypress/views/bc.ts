import { bucketStore, namespaceStore } from '../mocks/bucket-class';
import { commonFlows } from './common';
import { StoreType } from './store';

export const bcName = 'test-bucketclass';
const bcDescription =
  'test-bucketClass is a bucket class being used for testing purposes. Please do not use it for real storage purposes in case the test fails and the class is not deleted';

export enum Tier {
  SPREAD = 'SPREAD',
  MIRROR = 'MIRROR',
}

const TierCountMap = Object.freeze({
  [Tier.SPREAD]: 1,
  [Tier.MIRROR]: 2,
});

export enum BucketClassType {
  STANDARD = 'STANDARD',
  NAMESPACE = 'NAMESPACE',
}

export enum NamespacePolicyType {
  SINGLE = 'Single',
  MULTI = 'Multi',
  CACHE = 'Cache',
}

abstract class BucketClassConfig {
  public abstract setup: () => void;
  public abstract cleanup: () => void;

  constructor(
    public resources: string[],
    public type: BucketClassType
  ) {}
}

const createPVCBackingStore = (storeName: string) => {
  cy.log(`Creating a Backing Store resource named ${storeName}`);
  cy.exec(
    `echo '${JSON.stringify(
      bucketStore(storeName)
    )}' | oc create -n openshift-storage -f -`,
    { failOnNonZeroExit: false, timeout: 120000 }
  ).then(({ exitCode, stderr }) => {
    if (exitCode !== 0) {
      throw new Error(
        `Failed to create backing store "${storeName}": ${stderr}`
      );
    }
  });
};

export class StandardBucketClassConfig extends BucketClassConfig {
  tiers: Tier[];

  setup = () => this.resources.forEach(createPVCBackingStore);

  cleanup = () => {
    cy.log('Deleting backing stores');
    cy.exec(
      `oc delete backingstore ${this.resources.join(' ')} -n openshift-storage`,
      { failOnNonZeroExit: false }
    );
  };
}

const createAWSStore = (name: string, type: StoreType) => {
  cy.log(
    `Creating a ${
      type === StoreType.NamespaceStore ? 'Namespace' : 'Backing'
    } Store resource named ${name}`
  );
  cy.exec(
    `echo '${JSON.stringify(
      namespaceStore(name, type)
    )}' | oc create -n openshift-storage -f -`,
    { failOnNonZeroExit: false }
  );
};

export class NamespaceBucketClassConfig extends BucketClassConfig {
  namespacePolicyType: NamespacePolicyType;

  readonly testBackingStore: string = 'backingstore-test';

  setup = () => {
    this.resources.forEach((testResource) =>
      createAWSStore(testResource, StoreType.NamespaceStore)
    );
    createAWSStore(this.testBackingStore, StoreType.BackingStore);
  };

  cleanup = () => {
    cy.log('Deleting namespace stores and backing store');
    cy.exec(
      `oc delete namespacestores ${this.resources.join(
        ' '
      )} -n openshift-storage`,
      { failOnNonZeroExit: false }
    );
    cy.exec(
      `oc delete backingstore ${this.testBackingStore} -n openshift-storage`,
      { failOnNonZeroExit: false }
    );
  };
}

const tierLevelToButton = (level: number, tier: Tier) =>
  level === 1
    ? tier === Tier.SPREAD
      ? cy.byTestID('placement-policy-spread1')
      : cy.byTestID('placement-policy-mirror1')
    : tier === Tier.SPREAD
      ? cy.byTestID('placement-policy-spread2')
      : cy.byTestID('placement-policy-mirror2');

const setGeneralData = (type: BucketClassType) => {
  cy.byTestID(`${type.toLowerCase()}-radio`).should('be.visible').click();
  cy.byTestID('bucket-class-name').scrollIntoView();
  cy.byTestID('bucket-class-name').should('be.visible').type(bcName);
  cy.byTestID('bucket-class-description').type(bcDescription);
};

const setPlacementPolicy = (tiers: Tier[]) => {
  tierLevelToButton(1, tiers[0]).click();
  if (tiers.length > 1) {
    cy.byTestID('add-tier-btn').click();
    tierLevelToButton(2, tiers[1]).click();
  }
};

const selectStoreFromTable = (storeNo: number, name: string) => {
  // Wait for enough rows to be present before traversing (stability gate).
  // All traversal is synchronous jQuery to avoid React re-render races.
  cy.byLegacyTestID(name).should('have.length.gte', storeNo);
  cy.byLegacyTestID(name).then(($items) => {
    const $checkbox = $items
      .eq(storeNo - 1)
      .parent()
      .parent()
      .parent()
      .find('input[type="checkbox"]')
      .first();
    cy.wrap($checkbox).click();
  });
};

const setBackingStores = (tiers: Tier[]) => {
  const tests = ['test-store1', 'test-store2', 'test-store3', 'test-store4'];
  let storeIndex = 0;

  if (tiers.length > 1) {
    cy.byLegacyTestID('item-filter').should(($items) => {
      expect($items).to.have.length(2);
    });
  }

  // Tier 1
  selectStoreFromTable(1, tests[storeIndex++]);
  if (TierCountMap[tiers[0]] > 1) {
    selectStoreFromTable(1, tests[storeIndex++]);
  }

  // Tier 2 (if present)
  if (tiers.length > 1) {
    selectStoreFromTable(2, tests[storeIndex++]);
    if (TierCountMap[tiers[1]] > 1) {
      selectStoreFromTable(2, tests[storeIndex++]);
    }
  }
};

const selectItemFromStoreDropdown = (name: string, type: StoreType) => {
  cy.byTestID(
    `${type === StoreType.NamespaceStore ? 'nns' : 'nbs'}-dropdown-toggle`
  ).click();
  cy.byTestID(`${name}-dropdown-item`).click();
};

const configureNamespaceBucketClass = (
  namespacePolicyType: NamespacePolicyType,
  config: NamespaceBucketClassConfig
) => {
  switch (namespacePolicyType) {
    case NamespacePolicyType.SINGLE:
      selectItemFromStoreDropdown(
        config.resources[0],
        StoreType.NamespaceStore
      );
      break;
    case NamespacePolicyType.MULTI:
      selectStoreFromTable(1, config.resources[0]);
      selectStoreFromTable(1, config.resources[1]);
      selectItemFromStoreDropdown(
        config.resources[0],
        StoreType.NamespaceStore
      );
      break;
    case NamespacePolicyType.CACHE:
      selectItemFromStoreDropdown(
        config.resources[0],
        StoreType.NamespaceStore
      );
      selectItemFromStoreDropdown(
        config.testBackingStore,
        StoreType.BackingStore
      );
      cy.byTestID('time-to-live-input').type('2');
      break;
    default:
  }
};

export const createBucketClass = (config: BucketClassConfig) => {
  visitBucketClassPage();
  cy.byTestID('item-create').click();
  cy.byTestID(`${config.type.toLowerCase()}-radio`, {
    timeout: 30000,
  }).should('be.visible');

  cy.log('Select bucket class type');
  setGeneralData(config.type);
  cy.byTestID('wizard-next-btn').click();

  if (config.type === BucketClassType.STANDARD) {
    const { tiers } = config as StandardBucketClassConfig;
    cy.log('Select Placement policy');
    setPlacementPolicy(tiers);
    cy.byTestID('wizard-next-btn').click();
    cy.log('Select Backing Store');
    setBackingStores(tiers);
  } else {
    const { namespacePolicyType } = config as NamespaceBucketClassConfig;
    cy.log('Select Namespace policy');
    cy.byTestID(`${namespacePolicyType.toLowerCase()}-radio`).click();
    cy.byTestID('wizard-next-btn').click();
    cy.log('Select Namespace Store');
    configureNamespaceBucketClass(
      namespacePolicyType,
      config as NamespaceBucketClassConfig
    );
  }

  cy.byTestID('wizard-next-btn').click();
  cy.log('Create bucket class');
  cy.byTestID('wizard-next-btn').click();
  cy.url().should('not.include', '/create', { timeout: 60000 });
};

export const verifyBucketClass = () => {
  cy.log('Verifying bucket class');
  cy.byLegacyTestID('resource-title').should('contain', bcName, {
    timeout: 30000,
  });
};

export const deleteBucketClass = () => {
  cy.log('Deleting bucket class');
  cy.byTestID('kebab-button').click();
  cy.byTestActionID('Delete Bucket Class').click();
  cy.byTestID('delete-action').click();
};

export const visitBucketClassPage = () => {
  commonFlows.navigateToObjectStorage();
  cy.byTestID('horizontal-link-Bucket Class', { timeout: 30000 })
    .first()
    .click();
  cy.byTestID('item-create', { timeout: 30000 }).should('be.visible');
};
