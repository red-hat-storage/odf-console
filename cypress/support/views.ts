export const submitButton = 'button[type=submit]';
export const masthead = {
  username: {
    shouldBeVisible: () => cy.byTestID('username').should('be.visible'),
    shouldHaveText: (text: string) =>
      cy.byTestID('username').should('have.text', text),
  },
  clickMastheadLink: (path: string) => {
    return cy.byTestID(path).click();
  },
};
