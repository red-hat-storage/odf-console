import {
  configureVault,
  cleanUpVault,
  isPodRunningWithEncryptedPV,
} from '../support/vault-standalone';
import { pvc, deletePVCFromCLI } from '../views/pvc';
import {
  createStorageClass,
  deleteStorageClassFromCLI,
} from '../views/storage-class';

// Must be outside describe block to register before tests run
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('Cannot convert undefined or null to object')) {
    return false;
  }
  return true;
});

describe('Test Ceph pool creation', () => {
  const scName: string = 'sc-encrypt';
  const pvcName: string = 'encrypted-pvc';
  const kmsConnectionName: string = 'vault';
  const pvcNamespace: string = 'default';

  const cleanupKMSConnection = () => {
    cy.exec(
      `oc get configmap csi-kms-connection-details -n openshift-storage -o json`,
      { failOnNonZeroExit: false, timeout: 30000 }
    ).then((result: Cypress.Exec) => {
      if (result.stdout && result.stdout.includes(kmsConnectionName)) {
        cy.exec(
          `oc patch configmap csi-kms-connection-details -n openshift-storage ` +
            `--type=json -p='[{"op":"remove","path":"/data/${kmsConnectionName}"}]'`,
          { failOnNonZeroExit: false, timeout: 30000 }
        );
      }
    });
  };

  before(() => {
    cleanupKMSConnection();
    configureVault();
  });

  after(() => {
    deletePVCFromCLI(pvcName);
    deleteStorageClassFromCLI(scName);
    cleanupKMSConnection();
    cleanUpVault();
  });

  it('SC KMS encryption', () => {
    createStorageClass(scName, '', true);

    // Verify StorageClass was created and we are on the detail page
    cy.url().should('include', `/storageclasses/${scName}`);

    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
    pvc.createPVC(pvcName, '1', scName);

    // Wait for PVC to be Bound
    cy.exec(
      `oc wait pvc/${pvcName} --for=jsonpath="{.status.phase}"=Bound --timeout=120s -n ${pvcNamespace}`,
      { failOnNonZeroExit: false, timeout: 130000 }
    ).then((result: Cypress.Exec) => {
      cy.log('PVC wait result:', result.stdout || result.stderr);
      if (result.stderr) {
        cy.exec(`oc describe pvc/${pvcName} -n ${pvcNamespace}`, {
          failOnNonZeroExit: false,
        }).then((describeResult: Cypress.Exec) => {
          cy.log('PVC describe output:', describeResult.stdout);
        });
      }
    });

    // Wait for CSI node plugin to be ready
    cy.exec(
      'oc wait pods -l app=csi-rbdplugin -n openshift-storage --for=condition=Ready --timeout=60s',
      { failOnNonZeroExit: false, timeout: 70000 }
    );

    isPodRunningWithEncryptedPV();
  });
});
