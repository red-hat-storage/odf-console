import { KUBEADMIN_IDP, KUBEADMIN_USERNAME } from '../consts';
import { submitButton, masthead } from './views';

declare global {
  namespace Cypress {
    interface Chainable {
      login(
        providerName?: string,
        username?: string,
        password?: string
      ): Chainable<Element>;
      logout(): Chainable<Element>;
    }
  }
}

Cypress.Commands.add(
  'login',
  (provider: string, username: string, password: string) => {
    cy.session(
      'user-session',
      () => {
        // Check if auth is disabled (for a local development environment).
        cy.visit(''); // visits baseUrl which is set in plugins.js

        cy.window().then((win: any) => {
          if (win.SERVER_FLAGS?.authDisabled) {
            cy.task(
              'log',
              '  skipping login, console is running with auth disabled'
            );
            return;
          }

          cy.log(`window object location ${win?.location}`);
          cy.log(`OAUTH_BASE_ADDRESS ${Cypress.env('OAUTH_BASE_ADDRESS')}`);

          cy.origin(Cypress.env('OAUTH_BASE_ADDRESS'), () => {
            const idp = provider || KUBEADMIN_IDP;

            cy.task('log', `  Logging in as ${username || KUBEADMIN_USERNAME}`);

            cy.byLegacyTestID('login', { timeout: 10000 }).should('be.visible');

            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('body').then(($body) => {
              if ($body.text().includes(idp)) {
                cy.contains(idp).should('be.visible').click();
              }
            });

            /* eslint-disable cypress/require-data-selectors */
            cy.get('#inputUsername').type(username || KUBEADMIN_USERNAME);
            cy.get('#inputPassword').type(
              password || Cypress.env('BRIDGE_KUBEADMIN_PASSWORD'),
              {
                log: false,
              }
            );
            cy.get(submitButton).click();
          });

          // Back to the console's origin and ensure user is logged in.
          cy.visit('');
          /* eslint-enable cypress/require-data-selectors */
          masthead.username.shouldBeVisible();
        });
      },
      { cacheAcrossSpecs: true }
    );
  }
);
