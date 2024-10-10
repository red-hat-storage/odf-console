export const commonFlows = {
  navigateToODF: () => {
    cy.clickNavLink(['Storage', 'Data Foundation']);
  },
  navigateToObjectStorage: () => {
    cy.clickNavLink(['Storage', 'Object Storage']);
  },
};

export const commandPoll = (
  cmd: string,
  expected: string,
  failOnNonZeroExit: boolean = true,
  retry: number = 300,
  expectedCode?: number
) => {
  cy.exec(cmd, { failOnNonZeroExit }).then((res) => {
    if (
      (res.stdout === expected || expectedCode === res.code) &&
      res.stderr === ''
    ) {
      assert(true);
      return;
    }
    if (retry <= 0) {
      assert(false);
      return;
    }

    commandPoll(cmd, expected, failOnNonZeroExit, retry - 1, expectedCode);
  });
};
