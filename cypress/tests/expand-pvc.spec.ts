import { pvc, deletePVCFromCLI } from '../views/pvc';

describe('Tests Expansion of a PVC', () => {
  const cephfsPVCName = 'testpvcfs';
  const rbdPVCName = 'testpvcrbd';

  before(() => {
    deletePVCFromCLI(cephfsPVCName);
    deletePVCFromCLI(rbdPVCName);
  });

  beforeEach(() => {
    cy.clickNavLink(['Storage', 'PersistentVolumeClaims']);
  });

  after(() => {
    deletePVCFromCLI(cephfsPVCName);
    deletePVCFromCLI(rbdPVCName);
  });

  it('Test expansion of a CephFS PVC', () => {
    pvc.createPVC(cephfsPVCName, '5', 'ocs-storagecluster-cephfs');
    cy.contains(cephfsPVCName).should('exist').click();
    pvc.expandPVC('10');
    cy.byTestID('pvc-requested-capacity', { timeout: 30000 }).should(
      'contain',
      '10 GiB'
    );
  });

  it('Test expansion of a RBD PVC', () => {
    pvc.createPVC(rbdPVCName, '5', 'ocs-storagecluster-ceph-rbd', 'Block');
    cy.contains(rbdPVCName).should('exist').click();
    pvc.expandPVC('10');
    cy.byTestID('pvc-requested-capacity', { timeout: 30000 }).should(
      'contain',
      '10 GiB'
    );
  });
});
