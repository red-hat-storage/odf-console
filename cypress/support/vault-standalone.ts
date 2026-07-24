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

/**
 * Runs a command that a later step depends on. Unlike a bare
 * `failOnNonZeroExit: false` exec, this fails the test immediately with a
 * clear message if the command doesn't succeed, instead of letting the
 * failure surface later as a confusing, unrelated error.
 */
const execCritical = (
  command: string,
  options: Partial<Cypress.ExecOptions> = {}
) =>
  cy
    .exec(command, { failOnNonZeroExit: false, ...options })
    .then(({ exitCode, stderr }) => {
      if (exitCode !== 0) {
        throw new Error(`Command failed: "${command}"\n${stderr}`);
      }
    });

export const configureVault = () => {
  cy.exec('oc get project hashicorp', {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then(({ exitCode }) => {
    if (exitCode === 0) {
      cy.log('Vault is already deployed');
      return;
    }
    cy.log('Create a new project for internal vault');
    execCritical('oc new-project hashicorp', { timeout: 60000 }).then(() => {
      cy.log('Creating CR to configure vault');
      execCritical(
        `echo '${JSON.stringify(serviceAccountJSON)}' | oc apply -f -`,
        { timeout: 60000 }
      );
      execCritical(
        `echo '${JSON.stringify(roleBindingJSON)}' | oc apply -f -`,
        { timeout: 60000 }
      );
      execCritical(
        `echo '${JSON.stringify(pvcJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );
      execCritical(
        `echo '${JSON.stringify(configMapJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );

      cy.log('Deploying vault');
      execCritical(
        `echo '${JSON.stringify(deploymentJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );
      execCritical(
        `echo '${JSON.stringify(serviceJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );

      cy.log('Configuring router');
      execCritical(
        `echo '${JSON.stringify(routeJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );
      execCritical(
        `echo '${JSON.stringify(networkPolicyJSON)}' | oc apply -f - -n hashicorp`,
        { timeout: 60000 }
      );

      cy.log('Waiting for route to be available');
      execCritical(
        `oc wait route/vault -n hashicorp --for=jsonpath='{.status.ingress[0].conditions[0].status}'=True --timeout=120s`,
        { timeout: 130000 }
      );

      cy.log('Deploying test deployment');
      execCritical(
        `echo '${JSON.stringify(testDeploymentJSON)}' | oc apply -f -`,
        { timeout: 60000 }
      );

      // Wait for the pod to be Running (not Ready). Vault starts sealed and
      // uninitialized, so the readiness probe (`vault status`) fails until we
      // exec in and run `vault operator init` + `unseal`. Waiting for
      // condition=Ready would deadlock.
      cy.log('Waiting for vault pod to be in Running phase');
      execCritical(
        "oc wait pod -n hashicorp --for=jsonpath='{.status.phase}'=Running -l app.kubernetes.io/name=vault --timeout=300s",
        { timeout: 310000 }
      );

      initializeAndConfigureVault();
    });
  });
};

const initializeAndConfigureVault = () => {
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
    ).then(({ exitCode, stdout, stderr }) => {
      const rawOutput = stdout.trim();

      if (exitCode !== 0 || !rawOutput || !rawOutput.startsWith('{')) {
        if (stderr.includes('already initialized')) {
          // Vault was initialized by a previous run but the cleanup deleted
          // the token secret. We cannot retrieve the old root token, so
          // re-initialize by wiping the data directory and retrying.
          cy.log(
            'Vault already initialized — wiping data and re-initializing...'
          );
          execCritical(
            `oc exec ${podName} -n hashicorp -- /bin/sh -c "rm -rf /vault/data/*"`,
            { timeout: 30000 }
          );
          // Re-init after wipe
          execCritical(
            `oc exec ${podName} -n hashicorp -- vault operator init --key-shares=1 --key-threshold=1 --format=json`,
            { timeout: 120000 }
          ).then(({ stdout: reinitOutput }) => {
            const vaultObj = parseVaultOutput(reinitOutput.trim());
            unsealVault(podName, vaultObj.unseal_keys_b64[0]);
            enableSecretsEngine(podName, vaultObj.root_token);
            createKmsTokenSecret(vaultObj.root_token);
          });
          return;
        }
        throw new Error(`Failed to initialize vault: ${stderr || rawOutput}`);
      }

      const vaultObj = parseVaultOutput(rawOutput);
      const vaultKeys = vaultObj.unseal_keys_b64;
      const vaultToken = vaultObj.root_token;

      unsealVault(podName, vaultKeys[0]);
      enableSecretsEngine(podName, vaultToken);
      createKmsTokenSecret(vaultToken);
    });
  });
};

const parseVaultOutput = (rawOutput: string) => {
  let vaultObj: any;
  try {
    vaultObj = JSON.parse(rawOutput);
  } catch (_e) {
    throw new Error(`Failed to parse vault init output: "${rawOutput}"`);
  }

  if (!vaultObj?.unseal_keys_b64 || !vaultObj?.root_token) {
    throw new Error(`Missing vault keys or token in output: "${rawOutput}"`);
  }
  return vaultObj;
};

const unsealVault = (podName: string, unsealKey: string) => {
  cy.log('Unsealing Vault');
  execCritical(
    `oc exec ${podName} -n hashicorp -- vault operator unseal ${unsealKey}`,
    { timeout: 60000 }
  );
};

const enableSecretsEngine = (podName: string, token: string) => {
  cy.log('Enabling a key/value secrets engine');
  cy.exec(
    `oc exec ${podName} -n hashicorp -- /bin/sh -c 'export VAULT_TOKEN=${token} && vault secrets enable -path=secret kv'`,
    { timeout: 60000, failOnNonZeroExit: false }
  ).then(({ exitCode, stderr }) => {
    // "already in use" means the secrets engine was enabled by a previous
    // run - that's fine, anything else is a real failure.
    if (exitCode !== 0 && !stderr.includes('already in use')) {
      throw new Error(`Failed to enable secrets engine: ${stderr}`);
    }
  });
};

const createKmsTokenSecret = (token: string) => {
  cy.exec(
    `oc delete secret ceph-csi-kms-token -n default --ignore-not-found=true`,
    { failOnNonZeroExit: false, timeout: 60000 }
  );
  execCritical(
    `oc create secret generic ceph-csi-kms-token --from-literal=token=${token} -n default`,
    { timeout: 60000 }
  );
};

export const isPodRunningWithEncryptedPV = () => {
  cy.log('Checking pod is up and running with encrypted PV');
  execCritical(
    `oc wait deployment/${testDeploymentJSON.metadata.name} -n default --for=condition=Available --timeout=300s`,
    { timeout: 310000 }
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
  // Wait for pods to fully terminate so the PVC protection finalizer is released
  cy.exec(
    `oc wait pod -l app=hello-openshift -n default --for=delete --timeout=90s`,
    { failOnNonZeroExit: false, timeout: 100000 }
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
    timeout: 300000,
  });
};
