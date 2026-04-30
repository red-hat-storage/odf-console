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
    MON_DOWN: '1/3 mons down',
  },
  errors: {
    ERROR: 'failed to get status. . timed out: exit status 1',
  },
};

const closeAnyOpenPopovers = () => {
  // eslint-disable-next-line cypress/require-data-selectors
  cy.get('body')
    .find('[aria-label="Close"]')
    .each(($close) => {
      cy.wrap($close).scrollIntoView();
      cy.wrap($close).click();
    });
};

const checkHCPopover = () => {
  cy.byStatusID('Storage Cluster-secondary-status', {
    timeout: 5 * MINUTE,
  }).should('be.visible');

  cy.byItemID('Storage Cluster-health-item').contains('Storage Cluster');
  cy.contains(
    '[data-test="Storage Cluster-health-item"]',
    'Storage Cluster'
  ).scrollIntoView();
  cy.contains(
    '[data-test="Storage Cluster-health-item"]',
    'Storage Cluster'
  ).should('be.visible');
  cy.contains(
    '[data-test="Storage Cluster-health-item"]',
    'Storage Cluster'
  ).click();
};

const verifyMessagesAndRestore = (
  resources: Deployments[],
  expectedMessages: string[]
) => {
  scaleDeployments(resources, 0);
  checkHCPopover();

  expectedMessages.forEach((expectedMessage) => {
    cy.log(`Looking for message: ${expectedMessage}`);
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get(
      '[data-test="healthcheck-message"], ' +
        '[data-test="health-item-message"], ' +
        '[class*="popover-body"], ' +
        '[class*="healthcheck"]',
      { timeout: 10 * MINUTE }
    ).should('contain.text', expectedMessage);
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
