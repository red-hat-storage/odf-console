import { pvc } from '../views/pvc';

describe('Tests Expansion of a PVC', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
  });

  after(() => {
    cy.logout();
  });

  beforeEach(() => {
    cy.visit('/');
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
  });

  it('Test expansion of a CephFS PVC', () => {
    const cephPvcName = 'testpvcfs';
    pvc.deleteIfExists(cephPvcName, 'default');
    pvc.createPVC(cephPvcName, '5', 'ocs-storagecluster-cephfs');
    pvc.expandPVC('10');
    cy.byTestID('pvc-requested-capacity').contains('10 GiB');
  });

  it('Test expansion of a RBD PVC', () => {
    const rbdPvcName = 'testpvcrbd';
    pvc.deleteIfExists(rbdPvcName, 'default');
    pvc.createPVC(rbdPvcName, '5', 'ocs-storagecluster-ceph-rbd', 'Block');
    pvc.expandPVC('10');
    cy.byTestID('pvc-requested-capacity').contains('10 GiB');
  });
});
