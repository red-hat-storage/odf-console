import { K8sResourceKind, getCurrentDeviceSetIndex } from '../mocks/ksm';
import {
  testEbsSC,
  testNoProvisionerSC,
  getPVJSON,
} from '../mocks/storageclass';
import {
  withJSONResult,
  fetchStorageClusterJson,
  fetchWorkerNodesJson,
  addCapacity,
  newStorageClassTests,
  existingStorageClassTests,
  IndexAndDeviceSet,
  UidAndDeviceSet,
} from '../views/multiple-storageclass';

describe('Add capacity using multiple storage classes', () => {
  const beforeCapacityAddition: UidAndDeviceSet = {
    deviceSets: null,
    uid: null,
    portability: null,
    devicesCount: null,
  };

  before(() => {
    cy.exec(`echo '${JSON.stringify(testEbsSC)}' | kubectl apply -f -`);
    cy.exec(
      `echo '${JSON.stringify(testNoProvisionerSC)}' | kubectl apply -f -`
    );
    fetchWorkerNodesJson().then((res) => {
      const nodes = JSON.parse(res.stdout);
      const { name: scName } = testNoProvisionerSC.metadata;
      nodes.items.forEach((node, id) => {
        const nodeName = node.metadata.name;
        cy.exec(
          `echo '${JSON.stringify(
            getPVJSON(id, nodeName, scName)
          )}' | kubectl apply -f -`
        );
      });
    });
  });

  beforeEach(() => {
    cy.clickNavLink(['Storage', 'Storage cluster']);
    fetchStorageClusterJson().then((res) => {
      const json: K8sResourceKind = JSON.parse(res.stdout);
      beforeCapacityAddition.deviceSets = json.spec.storageDeviceSets;
      beforeCapacityAddition.uid = json.metadata.uid;
    });
  });

  after(() => {
    cy.exec(`echo '${JSON.stringify(testEbsSC)}' | kubectl delete -f -`);
    cy.exec(
      `echo '${JSON.stringify(testNoProvisionerSC)}' | kubectl delete -f -`
    );
    fetchWorkerNodesJson().then((res) => {
      const nodes = JSON.parse(res.stdout);
      const { name: scName } = testNoProvisionerSC.metadata;
      nodes.items.forEach((node, id) => {
        const nodeName = node.metadata.name;
        cy.exec(
          `echo '${JSON.stringify(
            getPVJSON(id, nodeName, scName)
          )}' | kubectl delete -f -`
        );
      });
    });
  });

  it('Add capacity with a new storage class having EBS as provisioner', () => {
    const { name: scName } = testEbsSC.metadata;
    const iAndD: IndexAndDeviceSet = { index: 0, deviceSets: [] };
    addCapacity(scName);
    fetchStorageClusterJson().then((res) => {
      withJSONResult(res, scName, iAndD);
      newStorageClassTests(beforeCapacityAddition, iAndD, true);
    });
  });

  it('Add capacity with an existing storage class having EBS as provisioner', () => {
    const { name: scName } = testEbsSC.metadata;
    const iAndD: IndexAndDeviceSet = { index: 0, deviceSets: [] };
    const { deviceSets } = beforeCapacityAddition;
    const index = getCurrentDeviceSetIndex(deviceSets, scName);
    cy.log('Count is:', index.toString());
    beforeCapacityAddition.portability = deviceSets[index].portable;
    beforeCapacityAddition.devicesCount = deviceSets[index].count;
    addCapacity(scName);
    fetchStorageClusterJson().then((res) => {
      withJSONResult(res, scName, iAndD);
      existingStorageClassTests(beforeCapacityAddition, iAndD);
    });
  });

  it(`Add capacity with a new storage class having NO-PROVISIONER as provisioner`, () => {
    const { name: scName } = testNoProvisionerSC.metadata;
    const iAndD: IndexAndDeviceSet = { index: 0, deviceSets: [] };
    addCapacity(scName);
    fetchStorageClusterJson().then((res) => {
      withJSONResult(res, scName, iAndD);
      newStorageClassTests(beforeCapacityAddition, iAndD, false);
    });
  });
});
