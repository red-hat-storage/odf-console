export const listPage = {
  rows: {
    shouldBeLoaded: () => {
      cy.get(`[data-test-rows="resource-row"`).should('be.visible');
    },
    clickKebabAction: (resourceName: string, actionName: string) => {
      cy.get(`[data-test-rows="resource-row"]`)
        .contains(resourceName)
        .parents('tr')
        .within(() => {
          cy.get('[data-test="kebab-button"]').click();
        });
      cy.byTestActionID(actionName).click();
    },
  },
  searchInList: (searchTerm: string) =>
    cy.byTestID('name-filter-input').type(searchTerm),
};
