import { MINUTE } from '../consts';
import { scaleDeployments } from '../helpers/active-health-checks';
import { ODFCommon } from '../views/odf-common';

const enum Deployments {
  ROOK_CEPH_MON_A = 'rook-ceph-mon-a',
  ROOK_CEPH_MON_B = 'rook-ceph-mon-b',
  ROOK_CEPH_MGR_A = 'rook-ceph-mgr-a',
}

const messages = {
  warnings: {
    MON_DOWN: '1/3 mons down, quorum b,c',
    // @TODO: investigate why in 4.15 we don't receive MGR_DOWN warning.
    // MGR_DOWN: 'no active mgr',
  },
  errors: {
    ERROR: 'failed to get status. . timed out: exit status 1',
  },
};

const checkHCPopover = () => {
  cy.byStatusID('Storage Cluster-secondary-status', {
    timeout: 5 * MINUTE,
  }).should('be.visible');
  cy.byItemID('Storage Cluster-health-item')
    .contains('Storage Cluster')
    .click();
};

const verifyMessagesAndRestore = (
  resources: Deployments[],
  expectedMessages: string[]
) => {
  scaleDeployments(resources, 0);
  checkHCPopover();
  expectedMessages.forEach((expectedMessage) => {
    cy.byTestID('healthcheck-message').contains(expectedMessage, {
      timeout: 5 * MINUTE,
    });
  });
  scaleDeployments(resources, 1);
};

const isStorageClusterHealthy = () => {
  // Check if cluster is in a healthy state (secondary status is not displayed when cluster is healthy).
  cy.byStatusID('Storage Cluster-secondary-status', {
    timeout: 5 * MINUTE,
  }).should('not.exist');
};

describe('Test Popover behaviour for different active health check cases.', () => {
  beforeEach(() => {
    ODFCommon.visitStorageCluster();
    isStorageClusterHealthy();
  });

  afterEach(() => {
    isStorageClusterHealthy();
  });

  it('Popover shows all warnings.', () => {
    const resources = [
      Deployments.ROOK_CEPH_MON_A,
      Deployments.ROOK_CEPH_MGR_A,
    ];
    verifyMessagesAndRestore(resources, Object.values(messages.warnings));
  });

  it('Popover shows the error.', () => {
    const resources = [
      Deployments.ROOK_CEPH_MON_A,
      Deployments.ROOK_CEPH_MON_B,
    ];
    verifyMessagesAndRestore(resources, Object.values(messages.errors));
  });
});
