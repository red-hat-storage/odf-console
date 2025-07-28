import { SECOND } from '../consts';
import { getPVCJSON } from '../helpers/pvc';
import { ODFCommon } from '../views/odf-common';
import { deletePVCFromCLI } from '../views/pvc';

const extractNumbersFromText = (text: string): string => {
  const matches = text.match(/\d+/g);
  return matches ? matches.join('') : '';
};

describe('Check Persistent Dashboard', () => {
  beforeEach(() => {
    ODFCommon.visitStorageCluster();
  });

  after(() => {
    deletePVCFromCLI('dummy-pvc', 'openshift-storage');
  });

  it('Check Status Card is healthy', () => {
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
    cy.log('Check the total number of OCS nodes');
    cy.get('.skeleton-activity').should('not.exist'); // eslint-disable-line cypress/require-data-selectors
    cy.exec(
      `oc get nodes -l cluster.ocs.openshift.io/openshift-storage -o json | jq '.items | length'`
    ).then(({ stdout }) => {
      cy.byTestID('inventory-nodes').should(
        'have.text',
        `${stdout.trim()} Nodes`,
        { timeout: 3 * SECOND }
      );
    });

    cy.log(
      'Check that number of PVCs and PVs is updated after successful PVC creation'
    );
    let initialPVC: number;
    let initialPV: number;
    cy.byTestID('inventory-pvc')
      .find('.skeleton-inventory')
      .should('not.exist');
    cy.byTestID('inventory-pvc')
      .invoke('text')
      .then((pvcText) => {
        initialPVC = Number(extractNumbersFromText(pvcText));
        cy.log(`Initial number of PVCs: ${initialPVC}`);
      });
    cy.byTestID('inventory-pv').find('.skeleton-inventory').should('not.exist');
    cy.byTestID('inventory-pv')
      .invoke('text')
      .then((pvText) => {
        initialPV = Number(extractNumbersFromText(pvText));
        cy.log(`Initial number of PVs: ${initialPV}`);
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
      cy.byTestID('inventory-pvc').should(
        'have.text',
        `${initialPVC + 1} PersistentVolumeClaims`,
        { timeout: 3 * SECOND }
      );
      cy.byTestID('inventory-pv').should(
        'have.text',
        `${initialPV + 1} PersistentVolumes`,
        { timeout: 3 * SECOND }
      );
    });
  });
});
