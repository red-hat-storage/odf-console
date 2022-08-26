import { submitButton } from './form';

export const modal = {
  shouldBeOpened: () =>
    cy.byLegacyTestID('modal-cancel-action').should('be.visible'),
  shouldBeClosed: () =>
    cy.byLegacyTestID('modal-cancel-action').should('not.exist'),
  // eslint-disable-next-line cypress/require-data-selectors
  submitShouldBeDisabled: () => cy.get(submitButton).should('be.disabled'),
  // eslint-disable-next-line cypress/require-data-selectors
  submitShouldBeEnabled: () => cy.get(submitButton).should('not.be.disabled'),
  // eslint-disable-next-line cypress/no-force
  cancel: (force: boolean = false) =>
    cy.byLegacyTestID('modal-cancel-action').click({ force }),
  // eslint-disable-next-line cypress/require-data-selectors,cypress/no-force
  submit: (force: boolean = false) =>
    cy.get('button').contains('Add').click({ force }),
  modalTitleShouldContain: (modalTitle: string) =>
    cy.byLegacyTestID('modal-title').should('contain.text', modalTitle),
};
