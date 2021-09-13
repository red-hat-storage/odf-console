export const commonFlows = {
  navigateToOdfDashboard: () => {
    cy.clickNavLink(['Storage', 'OpenShift Data Foundation']);
  },

  navigateToStorageSystem: () => {
    commonFlows.navigateToOdfDashboard()
    cy.byLegacyTestID('horizontal-link-Storage Systems').click();
  },

  navigateToOcsOverview: () => {
    commonFlows.navigateToStorageSystem()
    cy.contains('ocs-storagecluster').click();
  },
  
  checkAll: () => cy.get('input[name=check-all]'),
};
  
export const commandPoll = (
  cmd: string,
  expected: string,
  failOnNonZeroExit: boolean = true,
  retry: number = 300,
) => {
  cy.exec(cmd, { failOnNonZeroExit }).then((res) => {
    // Base cases
    if (res.stdout === expected) {
      assert(true);
      return;
    };
    if (retry <= 0) {
      assert(false);
      return;
    };
    // recursive call  
    commandPoll(cmd, expected, failOnNonZeroExit, retry - 1);
  });
};
