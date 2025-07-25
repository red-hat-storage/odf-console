import * as _ from 'lodash-es';
import {
  ClusterStatus,
  STORAGE_CLUSTER_NAME,
  CLUSTER_NAMESPACE,
  CEPH_CLUSTER_NAME,
  MINUTE,
} from '../consts';
import {
  createOSDTreeMap,
  getDeviceCount,
  getIds,
  getNewOSDIds,
  getPodRestartCount,
  isNodeReady,
  SIZE_MAP,
  verifyNodeOSDMapping,
  getPresentPod,
  getPodName,
} from '../helpers/add-capacity';
import { modal } from '../views/modals';
import { ODFCommon } from '../views/odf-common';

const ROOK_CONF_PATH =
  '/var/lib/rook/openshift-storage/openshift-storage.config';

describe('OCS Operator Expansion of Storage Class Test', () => {
  it('Add additional capacity to Storage Cluster', () => {
    const initialState = {
      storageCluster: null,
      cephCluster: null,
      osdTree: null,
      pods: null,
      formattedOSDTree: null,
      osdIDs: null,
    };

    cy.exec(
      `oc get storagecluster ${STORAGE_CLUSTER_NAME} -n ${CLUSTER_NAMESPACE} -o json`
    ).then((res) => {
      const storageCluster = JSON.parse(res.stdout);
      _.set(initialState, 'storageCluster', storageCluster);
    });
    cy.exec(
      `oc get cephCluster ${CEPH_CLUSTER_NAME} -n ${CLUSTER_NAMESPACE} -o json`
    ).then((res) => {
      const cephCluster = JSON.parse(res.stdout);
      _.set(initialState, 'cephCluster', cephCluster);

      cy.log('Check if ceph cluster is healthy before expansion');
      expect(cephCluster.status.ceph.health).not.to.equal(
        ClusterStatus.HEALTH_ERROR
      );
    });
    cy.exec(
      `oc -n ${CLUSTER_NAMESPACE} rsh $(oc get po -n ${CLUSTER_NAMESPACE} | grep ceph-operator | awk '{print$1}') ceph --conf=${ROOK_CONF_PATH} osd tree --format=json`,
      { timeout: 120000 }
    ).then((res) => {
      const osdTree = JSON.parse(res.stdout);
      _.set(initialState, 'osdTree', osdTree);

      const formattedOSDTree = createOSDTreeMap(osdTree.nodes);
      _.set(initialState, 'formattedOSDTree', formattedOSDTree);

      const osdIDs = getIds(osdTree.nodes, 'osd');
      _.set(initialState, 'osdIDs', osdIDs);
    });
    cy.exec(`oc get po -n ${CLUSTER_NAMESPACE} -o json`).then((res) => {
      const pods = JSON.parse(res.stdout);
      _.set(initialState, 'pods', pods);

      ODFCommon.visitStorageCluster();
      cy.byTestID('kebab-button').click();
      // eslint-disable-next-line cypress/require-data-selectors
      cy.contains('Add Capacity').click();
      modal.shouldBeOpened();

      const initialCapacity =
        SIZE_MAP[
          initialState.storageCluster?.spec?.storageDeviceSets?.[0]
            ?.dataPVCTemplate?.spec?.resources?.requests?.storage
        ];
      const replicas =
        initialState.storageCluster?.spec?.storageDeviceSets?.[0]?.replica;
      const provisionedCapacity = initialCapacity * replicas;
      cy.byTestID('requestSize').should('have.value', String(initialCapacity));
      cy.byTestID('provisioned-capacity').contains(
        `${Number.isInteger(provisionedCapacity) ? provisionedCapacity : provisionedCapacity.toFixed(2)} TiB`
      );
      cy.byTestID('add-cap-sc-dropdown', { timeout: 10000 }).should(
        'be.visible'
      );
      modal.submit();
      modal.shouldBeClosed();

      ODFCommon.visitStorageCluster();
      cy.get(
        '[data-item-id="Storage Cluster-health-item"] [data-test="success-icon"]',
        { timeout: 20 * MINUTE }
      );
    });
    cy.exec(
      `oc get storagecluster ${STORAGE_CLUSTER_NAME} -n ${CLUSTER_NAMESPACE} -o json`
    ).then((res) => {
      const storageCluster = JSON.parse(res.stdout);
      // Assertion of increment of device count
      cy.log('Check cluster device set count has increased');
      expect(getDeviceCount(initialState.storageCluster)).to.equal(
        getDeviceCount(storageCluster) - 1
      );
    });
    cy.exec(
      `oc get cephCluster ${CEPH_CLUSTER_NAME} -n ${CLUSTER_NAMESPACE} -o json`
    ).then((res) => {
      const cephCluster = JSON.parse(res.stdout);

      cy.log('Check if ceph cluster is healthy after expansion');
      expect(cephCluster.status.ceph.health).to.not.equal(
        ClusterStatus.HEALTH_ERROR
      );
    });
    cy.exec(`oc get po -n ${CLUSTER_NAMESPACE} -o json`).then((res) => {
      const pods = JSON.parse(res.stdout);

      cy.log('Check Pods have not restarted unexpectedly');
      initialState.pods.items.forEach((pod) => {
        const initalRestarts = getPodRestartCount(pod);
        const updatedPod = getPresentPod(pods, getPodName(pod));
        if (updatedPod) {
          const currentRestarts = getPodRestartCount(updatedPod);
          expect(initalRestarts).to.equal(currentRestarts);
        }
      });
    });
    cy.exec(
      `oc -n ${CLUSTER_NAMESPACE} rsh $(oc get po -n ${CLUSTER_NAMESPACE} | grep ceph-operator | awk '{print$1}') ceph --conf=${ROOK_CONF_PATH} osd tree --format=json`,
      { timeout: 120000 }
    ).then((res) => {
      const osdTree = JSON.parse(res.stdout);
      const formattedOSDTree = createOSDTreeMap(osdTree.nodes);
      const newOSDIds = getNewOSDIds(osdTree.nodes, initialState.osdIDs);

      cy.log('New OSDs are added correctly to the right nodes', () => {
        const nodes = getIds(osdTree.nodes, 'host');
        expect(
          verifyNodeOSDMapping(nodes, newOSDIds, formattedOSDTree)
        ).to.equal(true);
      });
    });
    cy.exec('oc get nodes -o json').then((res) => {
      const nodes = JSON.parse(res.stdout);
      const allNodesReady = nodes.items.every(isNodeReady);
      cy.log('No Nodes should go to Not Ready state');
      expect(allNodesReady).to.equal(true);
    });
  });
});
