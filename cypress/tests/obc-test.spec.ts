import { deployment } from '../mocks/deploymentData';
import {
  ACCESS_KEY,
  BOUND,
  MASK,
  MINUTE,
  NOOBAA_LABEL,
  NS,
  OBC_NAME,
  OBC_STORAGE_CLASS,
  OBC_STORAGE_CLASS_EXACT,
  SECRET_KEY,
  testName,
} from '../utils/consts';
import { detailsPage } from '../views/details-page';
import { listPage } from '../views/list-page';
import { CreateOBCHandler } from '../views/obcPage';

describe('Test Object Bucket Claim resource', () => {
  let obcHandler;
  let obcUrl;

  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    obcHandler = new CreateOBCHandler(OBC_NAME, testName, OBC_STORAGE_CLASS);
    obcHandler.createBucketClaim();
    cy.url().then((url) => {
      obcUrl = url;
    });
  });

  after(() => {
    cy.visit(obcUrl);
    CreateOBCHandler.deleteBucketClaim();
    cy.logout();
  });

  it('Test if Object Bucket Claim details page is rendered correctly', () => {
    cy.log('Test if OBC is bound');
    cy.byTestID('resource-status').contains(BOUND, { timeout: MINUTE });

    cy.log('Test if secret data is masked');
    cy.contains('Reveal Values');
    cy.byTestID('copy-to-clipboard').as('secrets');
    cy.get('@secrets').should(($el) => {
      const childCount = $el.length;
      const hiddenText = 'Value hidden';
      const elText = $el.text();
      const secrets = elText.split(hiddenText).slice(1);
      secrets.forEach((arrEl: string) => {
        expect(arrEl).to.equal(MASK);
      });
      expect(secrets.length).to.equal(childCount);
    });

    cy.log('Test if secret data can be revealed');
    CreateOBCHandler.revealHiddenValues();
    cy.byTestID('secret-data').should(($h) => {
      expect($h[0].innerText).to.equal('Endpoint');
      expect($h[2].innerText).to.equal('Access Key');
      expect($h[3].innerText).to.equal('Secret Key');
    });
    cy.byTestID('copy-to-clipboard').then(($el) => {
      expect($el[0].innerText).to.include(NS);
      expect($el[2].innerText).to.match(new RegExp(ACCESS_KEY));
      expect($el[3].innerText).to.match(new RegExp(SECRET_KEY));
    });

    cy.log('Test if secret data can be hidden again');
    CreateOBCHandler.hideValues();
    cy.byTestID('copy-to-clipboard').as('secrets');
    cy.get('@secrets').should(($el) => {
      const childCount = $el.length;
      const hiddenText = 'Value hidden';
      const elText = $el.text();
      const secrets = elText.split(hiddenText).slice(1);
      secrets.forEach((arrEl) => {
        expect(arrEl).to.equal(MASK);
      });
      expect(secrets.length).to.equal(childCount);
    });

    cy.log('Test if labels and annotations are shown correctly');
    cy.byTestID('label-list').contains(NOOBAA_LABEL);

    cy.log('Test if secret are shown correctly');
    cy.byLegacyTestID(OBC_NAME).contains(OBC_NAME);

    cy.log('Test if status and storage class are shown correctly');
    cy.byTestID('status-text').contains(BOUND);
    cy.byLegacyTestID('openshift-storage.noobaa.io').contains(
      OBC_STORAGE_CLASS_EXACT
    );

    cy.log('Test if Object Bucket is created');
    cy.byTestID('ob-link').click();
    detailsPage.isLoaded();
    cy.byLegacyTestID('resource-title').should('be.visible');
    cy.byTestID('resource-status').contains(BOUND);
  });

  it('Test attachment to a Deployment', () => {
    cy.exec(
      `echo '${JSON.stringify(
        deployment
      )}' | kubectl create -n ${testName} -f -`
    );
    cy.clickNavLink(['Storage', 'Object Bucket Claims']);
    listPage.rows.shouldBeLoaded();
    listPage.rows.clickKebabAction(OBC_NAME, 'Attach to Deployment');
    cy.byTestID('loading-indicator').should('not.exist');
    cy.byTestID('dropdown-selectbox').click();
    cy.contains(deployment.metadata.name).click();
    cy.byTestID('attach-action').click();
    cy.log(deployment.metadata.name);
    cy.exec(
      `echo '${JSON.stringify(
        deployment
      )}' | kubectl delete -n ${testName} -f -`
    );
  });
});
