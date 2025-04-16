import { KUBEADMIN_IDP, KUBEADMIN_USERNAME, SECOND } from '../consts';
import { submitButton, masthead } from './views';

declare global {
  namespace Cypress {
    interface Chainable {
      login(
        providerName?: string,
        username?: string,
        password?: string
      ): Chainable<Element>;
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
            cy.log('Skipping login, console is running with auth disabled');
          } else {
            cy.origin(
              Cypress.env('OAUTH_BASE_ADDRESS'),
              {
                args: {
                  provider,
                  username,
                  password,
                  KUBEADMIN_IDP,
                  KUBEADMIN_USERNAME,
                  SECOND,
                  submitButton,
                },
              },
              ({
                /* eslint-disable @typescript-eslint/no-shadow, @typescript-eslint/naming-convention */
                provider,
                username,
                password,
                KUBEADMIN_IDP,
                KUBEADMIN_USERNAME,
                SECOND,
                submitButton,
                /* eslint-enable @typescript-eslint/no-shadow, @typescript-eslint/naming-convention */
              }) => {
                const idp = provider || KUBEADMIN_IDP;

                cy.log(`Logging in as ${username || KUBEADMIN_USERNAME}`);
                // We cannot use byLegacyTestID here.
                cy.get('[data-test-id="login"]', {
                  timeout: 10 * SECOND,
                }).should('be.visible');

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
              }
            );

            // Ensure the user is logged in.
            /* eslint-enable cypress/require-data-selectors */
            masthead.username.shouldBeVisible();
          }

          // Close console tour modal.
          cy.byTestID('detail-item-title')
            .contains('Cluster API address')
            .should('be.visible');
          // eslint-disable-next-line cypress/require-data-selectors
          cy.get('body').then(($body) => {
            if ($body.find(`[data-test="guided-tour-modal"]`).length > 0) {
              cy.byTestID('tour-step-footer-secondary')
                .contains('Skip tour')
                .click();
              cy.byTestID('guided-tour-modal').should('not.exist');
            }
          });
        });
      },
      { cacheAcrossSpecs: true }
    );
  }
);
