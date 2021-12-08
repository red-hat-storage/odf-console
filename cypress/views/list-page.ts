export const listPage = {
    searchInList: (searchTerm: string) => cy.byTestID("name-filter-input").type(searchTerm),
}
