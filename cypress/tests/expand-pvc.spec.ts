import { pvc } from '../views/pvc';

describe('Tests Expansion of a PVC', () => {
  beforeEach(() => {
    cy.visit('/k8s/ns/default/persistentvolumeclaims');
  });

  it('Test expansion of a CephFS PVC', () => {
    const name = 'testpvc-' + Date.now();
    pvc.createPVC(name, '5', 'ocs-storagecluster-cephfs');
    cy.contains(name).should('exist');
  });

  it('Test expansion of a RBD PVC', () => {
    const name = 'testpvc-' + Date.now();
    pvc.createPVC(name, '5', 'ocs-storagecluster-ceph-rbd', 'Block');
    cy.contains(name).should('exist');
  });
});
