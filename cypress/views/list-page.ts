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
  searchInList: (searchTerm: string) => {
    cy.byTestID('name-filter-input').clear();
    cy.byTestID('name-filter-input').type(searchTerm);
    // Console's name filter debounces URL updates (250ms). Wait until that
    // settles while still on the list page; otherwise a late replace can
    // navigate back from a details page opened immediately after search.
    cy.location('search').should(
      'include',
      `name=${encodeURIComponent(searchTerm)}`
    );
  },
};
