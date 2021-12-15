import { OCSStorageClusterModel } from '../../packages/odf/models/ocs'; 
import { referenceForModel } from '../../packages/shared/utils/common';
import { commandPoll } from '../views/common';
import { navigateToBlockPoolListPage, blockPoolProps, blockPoolCRUDOperations, defaultPoolName } from '../views/block-pool';

const routeToBlockPoolListPage = () =>
  cy.byLegacyTestID('breadcrumb-link-1').click();

const routeToBlockPoolDetailsPage = (poolName: string) => {
  navigateToBlockPoolListPage();
  cy.byTestID(poolName).click();
};

const testDataItem = (id: string, itemIndex: number, ItemValue: string, ItemTitle?: string) => {
  ItemTitle && cy.byTestID(`${id}-title`).eq(itemIndex).should('contain.text', ItemTitle);
  cy.byTestID(`${id}-value`).eq(itemIndex).should('contain.text', ItemValue);
};

describe('Ensure block pool details page is created with all cards', () => {
  before(() => {
    cy.login();
    cy.visit('/');
    cy.install();
    navigateToBlockPoolListPage();
    blockPoolCRUDOperations.createBlockPool();
  });

  after(() => {
    blockPoolCRUDOperations.deleteBlockPoolFromCli();
    cy.logout();
  });

  it('Test breadcrumb link', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byLegacyTestID('breadcrumb-link-0')
      .should('have.attr', 'href')
      .and('include', '/odf/systems');
      cy.byLegacyTestID('breadcrumb-link-0').should('contain.text', 'StorageSystems');
    cy.byLegacyTestID("breadcrumb-link-1")
      .should('have.attr', 'href')
      .and('include', `/odf/system/${referenceForModel(OCSStorageClusterModel).toLowerCase()}/ocs-storagecluster-storagesystem/ceph.rook.io~v1~CephBlockPool`);
    cy.byLegacyTestID("breadcrumb-link-1").should('contain.text', 'StorageSystem details');
  });

  it('Test blockpool icon', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byTestID('block-pool-icon').should('contain.text', 'CephBlockPool');
    cy.byTestID('block-pool-icon').should('contain.text', 'CBP');
  });

  it('Test horizontal link', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byLegacyTestID("horizontal-link-Overview")
      .should('have.attr', 'href')
      .and('include', `/odf/system/${referenceForModel(OCSStorageClusterModel).toLowerCase()}/ocs-storagecluster-storagesystem/ceph.rook.io~v1~CephBlockPool/${defaultPoolName}/`);
    cy.byLegacyTestID("horizontal-link-Overview").should('have.text', 'Overview');
    cy.byLegacyTestID("horizontal-link-public~YAML")
      .should('have.attr', 'href')
      .and('include', `/odf/system/${referenceForModel(OCSStorageClusterModel).toLowerCase()}/ocs-storagecluster-storagesystem/ceph.rook.io~v1~CephBlockPool/${defaultPoolName}/yaml`);
    cy.byLegacyTestID("horizontal-link-public~YAML").should('have.text', 'YAML');
  });

  it('Test actions menu actions', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.log("Ensure menu actions are disaled for default pool");
    cy.byLegacyTestID("details-actions").should("be.hidden");
    
    routeToBlockPoolListPage();
    cy.log("Ensure menu actions are enabled for custom pool");
    cy.byTestID(blockPoolProps.poolName).click();
    cy.byLegacyTestID("details-actions").should("be.visible").click();
    cy.byTestActionID("Edit BlockPool").should("be.visible");
    cy.byTestActionID("Delete BlockPool").should("be.visible");
  });

  it('Test details card', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byLegacyTestID("details-card").should("be.visible");

    cy.log("Test details card for default pool");
    testDataItem("detail-item", 0, defaultPoolName, "Pool name",);
    testDataItem("detail-item", 1, "-", "Volume type");
    testDataItem("detail-item", 2, "3", "Replicas");
    
    routeToBlockPoolListPage();
    cy.log("Test details card for custom pool");
    cy.byTestID(blockPoolProps.poolName).click();
    testDataItem("detail-item", 0, blockPoolProps.poolName, "Pool name");
    testDataItem("detail-item", 1, "SSD", "Volume type");
    testDataItem("detail-item", 2, "2", "Replicas");
  });

  it('Test status card', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byLegacyTestID("status-card").should("be.visible");
    
    cy.log("Test Status card for default pool");
    cy.byTestID("status-text").should("contain.text", "Ready");
    
    routeToBlockPoolListPage();
    cy.log("Test Status card for custom pool");
    cy.byTestID(blockPoolProps.poolName).click();
    cy.byTestID("status-text").should("contain.text", "Ready");
  });

  it('Test inventory card', () => {
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.byLegacyTestID("inventory-card").should("be.visible");

    cy.log("Test inventory card for default pool");
    cy.byTestID("inventory-sc").should("contain.text", "StorageClass");
    cy.byTestID("inventory-pvc").should("contain.text", "PersistentVolumeClaim");
    
    routeToBlockPoolListPage();
    cy.log("Test inventory card for custom pool");
    cy.byTestID(blockPoolProps.poolName).click();
    cy.byTestID("inventory-sc").should("contain.text", "StorageClasses");
    cy.byTestID("inventory-pvc").should("contain.text", "PersistentVolumeClaim");
  });

  it('Test mirroring card', () => {
    cy.log("Enable mirroring at cluster level");
    cy.exec("oc patch StorageCluster $(oc get StorageCluster -n openshift-storage -o=jsonpath='{.items[0].metadata.name}')  -n openshift-storage --type json --patch  '[{ \"op\": \"replace\", \"path\": \"/spec/mirroring\", \"value\": {\"enabled\": true} }]'");
    
    cy.log("Deploying ceph tool");
    cy.exec("oc patch OCSInitialization ocsinit -n openshift-storage --type json --patch  '[{ \"op\": \"replace\", \"path\": \"/spec/enableCephTools\", \"value\": true }]'");  
    
    cy.log("Scheduling image replication for default pool");
    cy.exec("oc get pod -l app=rook-ceph-tools -o jsonpath=\"{.items[0].metadata.name}\" -n openshift-storage").then((pod) => {
      const podName = pod.stdout;  
      cy.log(`Check ceph tools is ready to ssh ${podName}`);
      commandPoll(`oc exec -ti ${podName} pwd -n openshift-storage`, '/', false);
      cy.exec(
        `oc exec -ti ${podName} -n openshift-storage -- rbd ls ${defaultPoolName}`
      ).then((image) => {
        const imageName = image.stdout.split('\n')[0];
        cy.log(`Enabling snapshot replication for image ${imageName}`);
        cy.exec(`oc exec -ti ${podName} -n openshift-storage -- rbd -p ${defaultPoolName} mirror image enable ${imageName} snapshot`, {failOnNonZeroExit: false});
      });
    });

    cy.log("Waiting for the mirror image info");
    commandPoll("oc get CephBlockPool -n openshift-storage -o=jsonpath='{.items[?(@.metadata.ownerReferences[*].kind==\"StorageCluster\")].status.mirroringStatus.summary.states.unknown}'", "1", false)
    
    routeToBlockPoolDetailsPage(defaultPoolName);
    cy.log("Ensure mirroring card is showing image mirroring info");
    cy.byLegacyTestID("mirroring-card").should("be.visible");

    cy.log("Test mirroring card for default pool");
    testDataItem("mirroring-card-item", 0, "Enabled", "Mirroring status");
    testDataItem("mirroring-card-item", 1, "WARNING", "Overall image health");
    testDataItem("mirroring-card-item", 2, "Show image states");
    cy.byTestID("mirroring-card-item-value").eq(2).find('.pf-c-expandable-section__toggle').click({force: true});
    testDataItem("mirroring-card-item", 2, "Unknown: 100%");
    testDataItem("mirroring-card-item", 3, "What does each state mean?");
    
    routeToBlockPoolListPage();
    cy.log("Test mirroring card for custom pool");
    cy.byTestID(blockPoolProps.poolName).click();
    testDataItem("mirroring-card-item", 0, "Disabled", "Mirroring status");
  });
});
