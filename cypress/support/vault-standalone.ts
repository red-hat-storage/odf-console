import {
  serviceAccountJSON,
  roleBindingJSON,
  pvcJSON,
  configMapJSON,
  deploymentJSON,
  serviceJSON,
  routeJSON,
  networkPolicyJSON,
  testDeploymentJSON,
} from '../helpers/vault';
import { commandPoll } from '../views/common';

export const configureVault = () => {
  cy.exec('oc delete project hashicorp --ignore-not-found=true', {
    failOnNonZeroExit: false,
    timeout: 120000,
  }).then(() => {
    cy.exec('oc wait --for=delete project/hashicorp --timeout=60s', {
      failOnNonZeroExit: false,
      timeout: 90000,
    }).then(() => {
      cy.log('Create a new project for internal vault');
      cy.exec('oc new-project hashicorp', {
        failOnNonZeroExit: false,
        timeout: 60000,
      }).then(() => {
        cy.log('Creating CR to configure vault');
        cy.exec(
          `echo '${JSON.stringify(serviceAccountJSON)}' | oc apply -f -`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );
        cy.exec(`echo '${JSON.stringify(roleBindingJSON)}' | oc apply -f -`, {
          failOnNonZeroExit: false,
          timeout: 60000,
        });
        cy.exec(
          `echo '${JSON.stringify(pvcJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );
        cy.exec(
          `echo '${JSON.stringify(configMapJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );

        cy.log('Deploying vault');
        cy.exec(
          `echo '${JSON.stringify(deploymentJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );
        cy.exec(
          `echo '${JSON.stringify(serviceJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );

        cy.log('Configuring router');
        cy.exec(
          `echo '${JSON.stringify(routeJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );
        cy.exec(
          `echo '${JSON.stringify(networkPolicyJSON)}' | oc apply -f - -n hashicorp`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );

        cy.log('Waiting for route to be available');
        const waitForRoute = (retries = 20): void => {
          cy.exec(
            'oc get route vault -n hashicorp --no-headers -o custom-columns=HOST:.spec.host',
            { failOnNonZeroExit: false, timeout: 30000 }
          ).then(({ stdout }) => {
            if (stdout.trim()) {
              cy.log(`Route is available: ${stdout.trim()}`);
            } else if (retries > 0) {
              waitForRoute(retries - 1);
            } else {
              throw new Error(
                'Route vault never became available after retries'
              );
            }
          });
        };
        waitForRoute();

        cy.log('Deploying test deployment');
        cy.exec(
          `echo '${JSON.stringify(testDeploymentJSON)}' | oc apply -f -`,
          { failOnNonZeroExit: false, timeout: 60000 }
        );

        cy.log('Waiting for vault pod to be in Running phase');
        cy.exec(
          'oc wait pod -n hashicorp --for=condition=Ready -l app.kubernetes.io/name=vault --timeout=300s',
          { timeout: 310000, failOnNonZeroExit: false }
        ).then(() => {
          cy.log('Generating vault keys and token');
          cy.exec(
            'oc get pods -n hashicorp -l app.kubernetes.io/name=vault --no-headers -o custom-columns=":metadata.name"',
            { timeout: 60000 }
          ).then((pod) => {
            const podName: string = pod.stdout.trim();
            cy.log(`Using vault pod: ${podName}`);

            cy.exec(
              `oc exec ${podName} -n hashicorp -- vault operator init --key-shares=1 --key-threshold=1 --format=json`,
              { timeout: 120000, failOnNonZeroExit: false }
            ).then((vault) => {
              const rawOutput = vault.stdout.trim();
              cy.log(`Vault init raw output: ${rawOutput}`);

              if (!rawOutput || !rawOutput.startsWith('{')) {
                cy.log(
                  'Vault may already be initialized or returned no output, skipping init...'
                );
                return;
              }

              let vaultObj: any;
              try {
                vaultObj = JSON.parse(rawOutput);
              } catch (_e) {
                throw new Error(
                  `Failed to parse vault init output: "${rawOutput}"`
                );
              }

              const vaultKeys = vaultObj?.unseal_keys_b64;
              const vaultToken = vaultObj?.root_token;

              if (!vaultKeys || !vaultToken) {
                throw new Error(
                  `Missing vault keys or token in output: "${rawOutput}"`
                );
              }

              cy.log('Unsealing Vault');
              cy.exec(
                `oc exec ${podName} -n hashicorp -- vault operator unseal ${vaultKeys[0]}`,
                { timeout: 60000, failOnNonZeroExit: false }
              ).then(() => {
                cy.log('Enabling a key/value secrets engine');
                cy.exec(
                  `oc exec ${podName} -n hashicorp -- /bin/sh -c 'export VAULT_TOKEN=${vaultToken} && vault secrets enable -path=secret kv'`,
                  { timeout: 60000, failOnNonZeroExit: false }
                ).then(() => {
                  cy.log(`vault token = ${vaultToken}`);
                  // Delete existing secret first to avoid AlreadyExists error on reruns
                  cy.exec(
                    `oc delete secret ceph-csi-kms-token -n default --ignore-not-found=true`,
                    { failOnNonZeroExit: false, timeout: 60000 }
                  ).then(() => {
                    cy.exec(
                      `oc create secret generic ceph-csi-kms-token --from-literal=token=${vaultToken} -n default`,
                      { failOnNonZeroExit: false, timeout: 60000 }
                    );
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

export const isPodRunningWithEncryptedPV = () => {
  cy.log('Checking pod is up and running with encrypted PV');
  cy.exec(
    `oc wait deployment/${testDeploymentJSON.metadata.name} -n default --for=condition=Available --timeout=300s`,
    { timeout: 310000, failOnNonZeroExit: false }
  );
  commandPoll(
    `oc get Deployment ${testDeploymentJSON.metadata.name} -n default -ojsonpath='{.status.availableReplicas}'`,
    '1'
  );
};

export const cleanUpVault = () => {
  cy.exec(
    `oc delete deployment ${testDeploymentJSON.metadata.name} -n default --ignore-not-found=true`,
    { failOnNonZeroExit: false, timeout: 60000 }
  );
  cy.exec(
    'oc delete secret ceph-csi-kms-token -n default --ignore-not-found=true',
    {
      failOnNonZeroExit: false,
      timeout: 60000,
    }
  );
  cy.exec(
    'oc delete configmap csi-kms-connection-details -n openshift-storage --ignore-not-found=true',
    { failOnNonZeroExit: false, timeout: 60000 }
  );
  cy.exec('oc delete project hashicorp --ignore-not-found=true', {
    failOnNonZeroExit: false,
    timeout: 120000,
  });
};
