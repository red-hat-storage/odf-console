import { SECOND, testBucket } from '../utils/consts';
import { ODFCommon } from '../views/odf-common';

describe('Tests Buckets, Status, Object Storage Efficiency, and Resource Providers Cards', () => {
  beforeEach(() => {
    ODFCommon.visitStorageDashboard();
    cy.byLegacyTestID('horizontal-link-Storage Systems').first().click();
    cy.byLegacyTestID('item-filter').type('ocs-storagecluster-storagesystem');
    cy.byTestRows('resource-row')
      .get('td a', {
        timeout: 5 * SECOND,
      })
      .first()
      .click();
    cy.byTestID('horizontal-link-Object').click();
  });

  it('Tests Buckets Cards', () => {
    cy.log('Create an Object Bucket Claim and test equality');
    cy.exec(`kubectl get ObjectBucketClaims -A | wc -l`).then(({ stdout }) => {
      // "-1" excludes the first heading row from the initial OBC count.
      let initCount = parseInt(stdout, 10);
      initCount = initCount ? initCount - 1 : initCount;
      cy.exec(`echo '${JSON.stringify(testBucket)}' | kubectl create -f -`);
      const newCount = initCount + 1;
      cy.byTestID('resource-inventory-item-obc').contains(
        `${newCount} Object Bucket Claim${newCount > 1 ? 's' : ''}`
      );
      cy.exec(`echo '${JSON.stringify(testBucket)}' | kubectl delete -f -`);
    });
  });

  it('Test Status Cards', () => {
    cy.log('Check if Multi Cloud Gateway is in a healthy state');
    cy.byTestID('Object Service-health-item-icon').within(() => {
      cy.byTestID('success-icon');
    });

    cy.log('Check if Data Resiliency of MCG is in healthy state');
    cy.byTestID('Data Resiliency-health-item-icon').within(() => {
      cy.byTestID('success-icon');
    });
  });

  it('Test Object Storage Efficiency Card', () => {
    cy.log('Check if Efficiency Ratio is in acceptable data range');
    cy.byTestID('Compression ratio-efficiency-card-status')
      .invoke('text')
      .should('not.eq', '')
      .then((text) => {
        const [ratioA, ratioB] = text.split(':');
        const [numA, numB] = [Number(ratioA), Number(ratioB)];
        if (Number.isNaN(numA) || Number.isNaN(numB)) {
          expect(text).to.equal('Not available');
        } else {
          expect(numA).to.be.greaterThan(0);
          expect(numB).to.equal(1);
        }
      });

    cy.log('Check for savings value to be in acceptable data range');
    cy.byTestID('Savings-efficiency-card-status')
      .invoke('text')
      .then((text) => {
        const [savDigits] = text.split(' ');
        const numSav = Number(savDigits);
        if (Number.isNaN(numSav)) {
          expect(text.trim()).to.equal('Not available');
        } else {
          expect(numSav).not.to.be.lessThan(0);
        }
      });
  });

  it('Test Resource Providers card', () => {
    cy.log('Check if resource provider has at least 1 provider');
    cy.byTestID('nb-resource-providers-card')
      .invoke('text')
      .then((text) => {
        const s = parseInt(text, 10);
        expect(s).greaterThan(0);
      });
  });
});
