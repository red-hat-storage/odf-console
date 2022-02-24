export const detailsPage = {
  getResourceTitle: () => cy.byLegacyTestID('resource-title'),
  isLoaded: () => cy.byTestID('skeleton-detail-view').should('not.exist'),
  breadcrumb: (breadcrumbIndex: number) =>
    cy.byLegacyTestID(`breadcrumb-link-${breadcrumbIndex}`),
};
