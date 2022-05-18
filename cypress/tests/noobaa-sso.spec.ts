import { ODFCommon } from '../views/odf-common';

describe('Check noobaa link in object service dashboard and perform SSO', () => {
  before(() => {
    cy.login();
    cy.install();
    ODFCommon.visitStorageDashboard();
    cy.byLegacyTestID('horizontal-link-Storage Systems').first().click();
    cy.byLegacyTestID('item-filter').type('ocs-storagecluster-storagesystem');
    cy.byTestRows('resource-row').get('td a').first().click();
    cy.byLegacyTestID('horizontal-link-Object').click();
  });

  after(() => {
    cy.logout();
  });

  it('Check that noobaa dashboard is opening and links available.', () => {
    cy.byLegacyTestID('system-name-mcg')
      .invoke('attr', 'href')
      .then((href) => {
        cy.request(href).then((response) => {
          expect(response.status).to.equal(200);
          expect(response.body).to.contain('NooBaa Management Console');
        });
      });
  });
});
