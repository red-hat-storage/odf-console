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
  cy.exec('oc get project hashicorp', {
    failOnNonZeroExit: false,
    timeout: 30000,
  }).then(({ exitCode }) => {
    if (exitCode === 0) {
      cy.log('Vault is already deployed');
      return;
    }
    cy.log('Create a new project for internal vault');
    cy.exec('oc new-project hashicorp', {
      failOnNonZeroExit: false,
      timeout: 60000,
    }).then(() => {
      cy.log('Creating CR to configure vault');
      cy.exec(`echo '${JSON.stringify(serviceAccountJSON)}' | oc apply -f -`, {
        failOnNonZeroExit: false,
        timeout: 60000,
      });
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
      cy.exec(
        `oc wait route/vault -n hashicorp --for=jsonpath='{.status.ingress[0].conditions[0].status}'=True --timeout=120s`,
        { failOnNonZeroExit: false, timeout: 130000 }
      );

      cy.log('Deploying test deployment');
      cy.exec(`echo '${JSON.stringify(testDeploymentJSON)}' | oc apply -f -`, {
        failOnNonZeroExit: false,
        timeout: 60000,
      });

      cy.log('Waiting for vault pod to be in Running phase');
      cy.exec(
        'oc wait pod -n hashicorp --for=condition=Ready -l app.kubernetes.io/name=vault --timeout=300s',
        { timeout: 310000, failOnNonZeroExit: false }
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
    ).then((vault) => {
      const rawOutput = vault.stdout.trim();

      if (!rawOutput || !rawOutput.startsWith('{')) {
        cy.log(
          'Vault may already be initialized or returned no output, skipping init...'
        );
        return;
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
  cy.exec(
    `oc exec ${podName} -n hashicorp -- vault operator unseal ${unsealKey}`,
    { timeout: 60000, failOnNonZeroExit: false }
  );
};

const enableSecretsEngine = (podName: string, token: string) => {
  cy.log('Enabling a key/value secrets engine');
  cy.exec(
    `oc exec ${podName} -n hashicorp -- /bin/sh -c 'export VAULT_TOKEN=${token} && vault secrets enable -path=secret kv'`,
    { timeout: 60000, failOnNonZeroExit: false }
  );
};

const createKmsTokenSecret = (token: string) => {
  cy.exec(
    `oc delete secret ceph-csi-kms-token -n default --ignore-not-found=true`,
    { failOnNonZeroExit: false, timeout: 60000 }
  );
  cy.exec(
    `oc create secret generic ceph-csi-kms-token --from-literal=token=${token} -n default`,
    { failOnNonZeroExit: false, timeout: 60000 }
  );
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
