import { getPVCJSON } from '../helpers/pvc';
import { ODFCommon } from '../views/odf-common';

describe('Check Persistent Dashboard', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  it('Check Status Card is in Healthy', () => {
    ODFCommon.visitStorageDashboard();
    cy.log('Check if Data Foundation is Healthy');
    cy.byTestID('success-icon').first().should('be.visible');
    cy.log('Check if Storage System is Healthy');
    cy.byTestID('success-icon').last().should('be.visible');
    cy.byLegacyTestID('horizontal-link-Storage Systems').first().click();
    cy.byLegacyTestID('item-filter').type('ocs-storagecluster-storagesystem');
    cy.byTestRows('resource-row').get('td a').first().click();
    cy.log('Check if Storage Cluster is Healthy');
    cy.byTestID('success-icon').first().should('be.visible');
    cy.log('Check if Data Resiliency is Healthy');
    cy.byTestID('success-icon').last().should('be.visible');
  });

  it('Check Details card is correct', () => {
    cy.byTestID('ocs-link')
      .contains('OpenShift Data Foundation')
      .scrollIntoView()
      .should('be.visible');
    cy.byTestID('detail-item-value')
      .contains('ocs-storagecluster')
      .scrollIntoView()
      .should('be.visible');
  });

  it('Check Inventory card is correct', () => {
    cy.log('Check the total number of OCS nodes');
    cy.get('.skeleton-activity').should('not.exist'); // eslint-disable-line cypress/require-data-selectors
    cy.byTestID('inventory-nodes')
      .invoke('text')
      .then((text) => {
        cy.exec(
          `oc get nodes -l cluster.ocs.openshift.io/openshift-storage -o json | jq '.items | length'`
        ).then(({ stdout }) => {
          expect(text).to.equal(`${stdout.trim()} Nodes`);
        });
      });

    cy.log(
      'Check that number of PVCs and PVs is updated after sucessful PVC creation'
    );
    cy.byTestID('inventory-pvc')
      .invoke('text')
      .then((pvcText) => {
        const [numberPVC] = pvcText.split(' ');
        const initialPVC = Number(numberPVC);
        cy.exec(
          ` echo '${JSON.stringify(
            getPVCJSON(
              'dummy-pvc',
              'openshift-storage',
              'ocs-storagecluster-ceph-rbd',
              '5Gi'
            )
          )}' | oc create -f -`
        ).then(() => {
          cy.byTestID('inventory-pvc').contains(
            `${(initialPVC + 1).toString()} PersistentVolumeClaims`
          );
          cy.byTestID('inventory-pv').contains(
            `${(initialPVC + 1).toString()} PersistentVolumes`
          );
        });
      });
  });
});
