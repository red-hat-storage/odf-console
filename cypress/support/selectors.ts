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
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
      ): Chainable<Element>;
      byTestActionID(selector: string): Chainable<Element>;
      byLegacyTestID(selector: string): Chainable<Element>;
      byTestDropDownMenu(selector: string): Chainable<Element>;
      byTestOperandLink(selector: string): Chainable<Element>;
      byTestRows(selector: string): Chainable<Element>;
      clickNavLink(path: [string, string?]): Chainable<Element>;
      byTestOperatorRow(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
      ): Chainable<Element>;
      byItemID(selector: string): Chainable<Element>;
      byStatusID(
        selector: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
      ): Chainable<Element>;
    }
  }
}

const { $ } = Cypress;

Cypress.Commands.add(
  'byTestID',
  (
    selector: string,
    options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
  ) => {
    cy.get(`[data-test="${selector}"]`, options);
  }
);

Cypress.Commands.add('byLegacyTestID', (selector: string) =>
  cy.get(`[data-test-id="${selector}"]`)
);

Cypress.Commands.add('byTestOperandLink', (selector: string) =>
  cy.get(`[data-test-operand-link="${selector}"]`)
);

Cypress.Commands.add('byTestRows', (selector: string) =>
  cy.get(`[data-test-rows="${selector}"]`)
);

Cypress.Commands.add('byTestActionID', (selector: string) =>
  cy.get(`[data-test-action="${selector}"]:not(.pf-m-disabled)`)
);
Cypress.Commands.add(
  'byTestOperatorRow',
  (selector: string, options?: object) =>
    cy.get(`[data-test-operator-row="${selector}"]`, options)
);

Cypress.Commands.add('byTestDropDownMenu', (selector: string) =>
  cy.get(`[data-test-dropdown-menu="${selector}"]`)
);

Cypress.Commands.add('clickNavLink', (path: [string, string?]) => {
  cy.byTestID('nav')
    .contains(path[0], { timeout: 10 * 1000 })
    .should((el) => {
      if ($(el).attr('aria-expanded') == 'false') {
        $(el).click();
      }
    });
  if (path.length > 1) {
    cy.get('#page-sidebar').contains(path[1]).click();
  }
});
Cypress.Commands.add('byItemID', (selector: string) =>
  cy.get(`[data-item-id="${selector}"]`)
);
Cypress.Commands.add(
  'byStatusID',
  (
    selector: string,
    options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
  ) => cy.get(`[data-status-id="${selector}"]`, options)
);
