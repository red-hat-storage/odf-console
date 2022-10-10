import {
  compressionPool,
  compressionStorageClass,
  fioConfig,
  fioJob,
  fioPVC,
} from '../mocks/compression';
import { navigateToBlockPool } from '../views/block-pool';
import { commandPoll } from '../views/common';

describe('Test Pool Compression', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    cy.enableToolboxPod();
    cy.exec(`echo '${JSON.stringify(compressionPool)}' | oc apply -f -`);
    cy.exec(
      `echo '${JSON.stringify(compressionStorageClass)}' | oc apply -f -`
    );
    cy.exec(`echo '${fioConfig}' | oc apply -f -`);
    cy.exec(`echo '${JSON.stringify(fioPVC)}' | oc apply -f -`);
    cy.exec(`echo '${JSON.stringify(fioJob)}' | oc apply -f -`);
    commandPoll('oc get job fio -n openshift-storage', null, false, 300, 0);
    cy.exec(`oc wait --for=condition=complete job fio -n openshift-storage`, {
      timeout: 120000,
    });
  });

  it('Tests compression statistics are correct on the BlockPool list Page', () => {
    navigateToBlockPool();
    cy.byTestID('name-filter-input').type(compressionPool.metadata.name);
    // TableData does not support data-test ids
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get('#compressionStatus').should('have.text', 'Enabled');
    cy.exec(
      `oc exec -it $(oc get pods -n openshift-storage -l app=rook-ceph-tools -o name) -n openshift-storage -- /usr/bin/rados df -f json`
    ).then(({ stdout }) => {
      const poolData = JSON.parse(stdout).pools;
      const plasmaPool = poolData.find(
        (pool) => pool.name === compressionPool.metadata.name
      );
      const compressionSavings = plasmaPool.compress_bytes_used;
      // TableData does not support data-test ids
      // eslint-disable-next-line cypress/require-data-selectors
      cy.get('#compressionSavings').contains(
        (compressionSavings / 1024 ** 2).toFixed(1)
      );
    });
  });

  after(() => {
    cy.exec(`echo ${JSON.stringify(fioJob)} | oc delete -f -`);
    cy.exec(`echo ${JSON.stringify(fioPVC)} | oc delete -f -`);
    cy.exec(`echo ${JSON.stringify(fioConfig)} | oc delete -f -`);
    cy.exec(
      `oc delete storageclass ${compressionStorageClass.metadata.name} --wait=false --grace-period=0`
    );
    cy.exec(
      `oc delete cephblockpool ${compressionPool.metadata.name} -n ${compressionPool.metadata.namespace} --grace-period=0 --force --wait=false`
    );
    cy.logout();
  });
});
