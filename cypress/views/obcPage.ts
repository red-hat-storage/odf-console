import { projectNameSpace } from '../support/pages/app';
import { app } from '../support/pages/app';
import { MINUTE } from '../utils/consts';
import { listPage } from './list-page';

export class CreateOBCHandler {
  name: string;

  namespace: string;

  storageclass: string;

  constructor(name: string, namespace: string, storageclass: string) {
    this.name = name;
    this.namespace = namespace;
    this.storageclass = storageclass;
  }

  createBucketClaim() {
    app.waitForLoad();
    cy.get('#page-sidebar').contains('Data Foundation'); // eslint-disable-line cypress/require-data-selectors
    cy.clickNavLink(['Storage', 'Object Bucket Claims']);
    projectNameSpace.selectOrCreateProject(this.namespace);
    cy.clickNavLink(['Storage', 'Object Bucket Claims']);
    cy.byLegacyTestID('namespace-bar-dropdown').contains('Project').click();
    cy.contains(this.namespace);
    cy.byTestID('item-create').click();
    cy.byTestID('obc-name').type(this.name);
    cy.byTestID('loading-indicator').should('not.exist');
    cy.byTestID('sc-dropdown').should('be.visible').click();
    cy.contains('openshift-storage.noobaa.io').click();
    app.waitForLoad();
    cy.byTestID('obc-create').click();
    cy.byLegacyTestID('resource-title').contains(this.name, {
      timeout: MINUTE,
    });
  }

  static revealHiddenValues() {
    cy.contains('Reveal Values').click();
  }

  static hideValues() {
    cy.contains('Hide Values').click();
  }

  deleteBucketClaim() {
    cy.clickNavLink(['Storage', 'Object Bucket Claims']);
    cy.byTestID('loading-indicator').should('not.exist');
    cy.log('Deleting Object Bucket Claim');
    listPage.rows.clickKebabAction(this.name, 'Delete Object Bucket Claim');
    cy.byTestID('delete-action').click();
  }
}
