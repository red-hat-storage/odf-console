import { MINUTE } from '../consts';
import { scaleDeployments } from '../helpers/active-health-checks';
import { ODFCommon } from '../views/odf-common';

const enum Deployments {
  ROOK_CEPH_MON_A = 'rook-ceph-mon-a',
  ROOK_CEPH_MON_B = 'rook-ceph-mon-b',
  ROOK_CEPH_MON_C = 'rook-ceph-mon-c',
}

const messages = {
  warnings: {
    // Using a partial match — the full message includes quorum details
    // (e.g. "1/3 mons down, quorum b,c") that vary by cluster topology,
    // so matching only the stable prefix avoids environment-specific failures.
    MON_DOWN: '1/3 mons down',
    // @TODO: investigate why in 4.15 we don't receive MGR_DOWN warning.
    // MGR_DOWN: 'no active mgr',
  },
  errors: {
    ERROR: 'failed to get status. . timed out: exit status 1',
  },
};

const closeAnyOpenPopovers = () => {
  cy.document().then((doc) => {
    doc.querySelectorAll<HTMLElement>('[aria-label="Close"]').forEach((el) => {
      el.click();
    });
  });
};

const checkHCPopover = () => {
  cy.byStatusID('Storage Cluster-secondary-status', {
    timeout: 5 * MINUTE,
  }).should('be.visible');

  cy.byItemID('Storage Cluster-health-item')
    .contains('Storage Cluster')
    .as('healthItem');
  cy.get('@healthItem').scrollIntoView();
  cy.get('@healthItem').should('be.visible').click();
};

const verifyMessagesAndRestore = (
  resources: Deployments[],
  expectedMessages: string[]
) => {
  scaleDeployments(resources, 0);
  checkHCPopover();

  expectedMessages.forEach((expectedMessage) => {
    cy.log(`Looking for message: ${expectedMessage}`);
    cy.byTestID('healthcheck-message', { timeout: 10 * MINUTE }).should(
      'contain.text',
      expectedMessage
    );
  });

  scaleDeployments(resources, 1);
  closeAnyOpenPopovers();
};

const isStorageClusterHealthy = () => {
  closeAnyOpenPopovers();
  cy.reload();

  cy.byStatusID('Storage Cluster-secondary-status', {
    timeout: 10 * MINUTE,
  }).should('not.exist');
};

describe('Test Popover behaviour for different active health check cases.', () => {
  beforeEach(() => {
    ODFCommon.visitStorageCluster();
    isStorageClusterHealthy();
  });

  afterEach(() => {
    // Dynamically restore ALL mon deployments
    cy.exec(
      `oc get deployments -n openshift-storage --no-headers | grep rook-ceph-mon | awk '{print $1}'`
    ).then((result) => {
      const mons = result.stdout.trim().split('\n').filter(Boolean);
      mons.forEach((mon) => {
        cy.exec(`oc scale --replicas=1 deploy ${mon} -n openshift-storage`, {
          failOnNonZeroExit: false,
        });
      });
    });

    // Dynamically restore ALL mgr deployments
    cy.exec(
      `oc get deployments -n openshift-storage --no-headers | grep rook-ceph-mgr | awk '{print $1}'`
    ).then((result) => {
      const mgrs = result.stdout.trim().split('\n').filter(Boolean);
      mgrs.forEach((mgr) => {
        cy.exec(`oc scale --replicas=1 deploy ${mgr} -n openshift-storage`, {
          failOnNonZeroExit: false,
        });
      });
    });

    isStorageClusterHealthy();
  });

  it('Popover shows all warnings.', () => {
    const resources = [Deployments.ROOK_CEPH_MON_A];
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
