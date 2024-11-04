import { STORAGE_SYSTEM_NAME } from '../consts';
import { getPVCJSON } from '../helpers/pvc';
import { ODFCommon } from '../views/odf-common';
import { deletePVCFromCLI } from '../views/pvc';

describe('Check Persistent Dashboard', () => {
  let initialPVC;
  let initialPV;

  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    deletePVCFromCLI('dummy-pvc', 'openshift-storage');
    cy.logout();
  });

  it('Check Status Card is in Healthy', () => {
    ODFCommon.visitStorageDashboard();
    cy.log('Check if Data Foundation is Healthy');
    cy.byTestID('success-icon').first().should('be.visible');
    cy.log('Check if Storage System is Healthy');
    cy.byTestID('success-icon').last().should('be.visible');
    cy.byLegacyTestID('horizontal-link-Storage Systems').first().click();
    cy.byLegacyTestID('item-filter').type(STORAGE_SYSTEM_NAME);
    cy.byTestRows('resource-row').get('td a').first().click();
    cy.log('Check if Storage Cluster is Healthy');
    cy.byTestID('success-icon').first().should('be.visible');
    cy.log('Check if Data Resiliency is Healthy');
    cy.byTestID('success-icon').last().should('be.visible');
  });

  it('Check Details card is correct', () => {
    cy.byTestID('ocs-link').contains('Data Foundation').scrollIntoView();
    cy.byTestID('ocs-link').should('be.visible');
    cy.byTestID('detail-item-value')
      .contains('ocs-storagecluster')
      .scrollIntoView();
    cy.byTestID('detail-item-value').should('be.visible');
    cy.log('Check redirect link goes to operator details page');
    cy.byTestID('ocs-link').click();
    cy.url().should(
      'include',
      'k8s/ns/openshift-storage/operators.coreos.com~v1alpha1~ClusterServiceVersion/odf-operator'
    );
  });

  it('Check Inventory card is correct', () => {
    ODFCommon.visitStorageDashboard();
    cy.byLegacyTestID('horizontal-link-Storage Systems').first().click();
    cy.byLegacyTestID('item-filter').type(STORAGE_SYSTEM_NAME);
    cy.byTestRows('resource-row').get('td a').first().click();
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
        initialPVC = Number(numberPVC);
      });
    cy.byTestID('inventory-pv')
      .invoke('text')
      .then((pvText) => {
        const [numberPV] = pvText.split(' ');
        initialPV = Number(numberPV);
      });
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
        `${(initialPV + 1).toString()} PersistentVolumes`
      );
    });
  });
});
