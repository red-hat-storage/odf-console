import { K8sResourceKind, getCurrentDeviceSetIndex } from '../mocks/ksm';
import { testEbsSC, testNoProvisionerSC } from '../mocks/storageclass';
import {
  withJSONResult,
  fetchStorageClusterJson,
  addCapacity,
  assertStorageClassNamesAbsentInAddCapacityDropdown,
  existingStorageClassTests,
  IndexAndDeviceSet,
  openAddCapacityModal,
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
  });

  it('Add Capacity modal does not list StorageClasses that are not already used by the cluster', () => {
    openAddCapacityModal();
    assertStorageClassNamesAbsentInAddCapacityDropdown([
      testEbsSC.metadata.name,
      testNoProvisionerSC.metadata.name,
    ]);
  });

  it('Add capacity with an existing storage class having EBS as provisioner', () => {
    const iAndD: IndexAndDeviceSet = { index: 0, deviceSets: [] };
    const { deviceSets } = beforeCapacityAddition;
    let scName = testEbsSC.metadata.name;
    let index = getCurrentDeviceSetIndex(deviceSets, scName);
    if (index === -1) {
      const installSC = deviceSets[0]?.dataPVCTemplate?.spec?.storageClassName;
      expect(
        installSC,
        'storageDeviceSets[0] must declare a StorageClass when test-ebs-sc is not used by the cluster'
      ).to.be.a('string');
      scName = installSC;
      index = getCurrentDeviceSetIndex(deviceSets, scName);
    }
    cy.log('Count is:', index.toString());
    beforeCapacityAddition.portability = deviceSets[index].portable;
    beforeCapacityAddition.devicesCount = deviceSets[index].count;
    addCapacity(scName);
    fetchStorageClusterJson().then((res) => {
      withJSONResult(res, scName, iAndD);
      existingStorageClassTests(beforeCapacityAddition, iAndD);
    });
  });
});
