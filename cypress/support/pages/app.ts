export const app = {
  waitForDocumentLoad: () => {
    cy.document().its('readyState').should('eq', 'complete');
  },
  waitForLoad: (timeout: number = 160000) => {
    /* eslint-disable cypress/require-data-selectors */
    cy.get('.co-m-loader', { timeout }).should('not.exist');
    cy.get('.pf-c-spinner', { timeout }).should('not.exist');
    cy.get('.skeleton-catalog--grid', { timeout }).should('not.exist');
    cy.get('.loading-skeleton--table', { timeout }).should('not.exist');
    /* eslint-enable cypress/require-data-selectors */
    cy.byTestID('skeleton-detail-view', { timeout }).should('not.exist');
    app.waitForDocumentLoad();
  },
};

export const projectNameSpace = {
  clickProjectDropdown: () => {
    cy.byLegacyTestID('namespace-bar-dropdown').find('button').first().click();
  },

  enterProjectName: (projectName: string) => {
    cy.byLegacyTestID('modal-cancel-action').should('be.visible');
    cy.get('#input-name').type(projectName); // eslint-disable-line cypress/require-data-selectors
  },

  selectOrCreateProject: (projectName: string) => {
    app.waitForLoad();
    projectNameSpace.clickProjectDropdown();
    cy.byTestID('showSystemSwitch').check(); // Ensure that all projects are showing
    cy.byTestID('dropdown-menu-item-link').should('have.length.gt', 5);
    // Bug: ODC-6164 - is created related to Accessibility violation - Until bug fix, below line is commented to execute the scripts in CI
    // cy.testA11y('Create Project modal');
    cy.byTestID('dropdown-text-filter').clear();
    cy.byTestID('dropdown-text-filter').should('be.empty');
    cy.byTestID('dropdown-text-filter').type(projectName);
    cy.byTestID('dropdown-text-filter').should('have.value', projectName);
    cy.get('[data-test-id="namespace-bar-dropdown"] span')
      .first()
      .as('projectNameSpaceDropdown');
    app.waitForDocumentLoad();
    cy.get('[data-test="namespace-dropdown-menu"]')
      .first()
      .then(($el) => {
        if ($el.find('[data-test="dropdown-menu-item-link"]').length === 0) {
          cy.byTestDropDownMenu('#CREATE_RESOURCE_ACTION#').click();
          projectNameSpace.enterProjectName(projectName);
          cy.byTestID('confirm-action').click();
          app.waitForLoad();
        } else {
          cy.get('[data-test="namespace-dropdown-menu"]')
            .find('[data-test="dropdown-menu-item-link"]')
            .contains(projectName)
            .click();
          cy.get('@projectNameSpaceDropdown').then(($el1) => {
            if ($el1.text().includes(projectName)) {
              cy.get('@projectNameSpaceDropdown').should(
                'contain.text',
                projectName
              );
            } else {
              cy.byTestDropDownMenu('#CREATE_RESOURCE_ACTION#').click();
              projectNameSpace.enterProjectName(projectName);
              cy.byTestID('confirm-action').click();
              app.waitForLoad();
            }
          });
        }
      });
    cy.get('@projectNameSpaceDropdown').should(
      'have.text',
      `Project: ${projectName}`
    );
  },
};
