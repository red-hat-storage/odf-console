/* eslint-disable @typescript-eslint/no-use-before-define */
import Loggable = Cypress.Loggable;
import Timeoutable = Cypress.Timeoutable;
import Withinable = Cypress.Withinable;
import Shadow = Cypress.Shadow;

export {};
declare global {
  namespace Cypress {
    interface Chainable<Subject> {
      byTestID(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>,
      ): Chainable<Element>;
      byLegacyTestID(selector: string): Chainable<Element>;
      byTestOperandLink(selector: string): Chainable<Element>;
      clickNavLink(path: [string, string?]): Chainable<Element>;
    }
  }
}

Cypress.Commands.add(
  'byTestID',
  (selector: string, options?: Partial<Loggable & Timeoutable & Withinable & Shadow>) => {
    cy.get(`[data-test="${selector}"]`, options);
  },
);

Cypress.Commands.add('byLegacyTestID', (selector: string) =>
  cy.get(`[data-test-id="${selector}"]`),
);

Cypress.Commands.add('byTestOperandLink', (selector: string) =>
  cy.get(`[data-test-operand-link="${selector}"]`),
);

Cypress.Commands.add('clickNavLink', (path: [string, string?]) => {
  cy.byTestID("nav")
    .contains(path[0], { timeout: 10 * 1000 })
    .click({ force: true });
  if(path.length > 1) {
    cy.get('#page-sidebar')
    .contains(path[1])
    .click();
  }
});
