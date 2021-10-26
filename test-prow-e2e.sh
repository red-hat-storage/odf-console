#!/usr/bin/env bash

set -eExuo pipefail

if [ $# -eq 0 ]
  then
    echo "odf-console image not provided"
    echo "exiting..."
    exit 1
fi

trap generateLogsAndCopyArtifacts EXIT
trap generateLogsAndCopyArtifacts ERR

timeout 15m bash <<-'EOF'
echo "waiting for odf-catalogsource connection to be in READY state"
until [ "$(oc get catalogsource -n openshift-marketplace -o=jsonpath='{.items[?(@.metadata.name=="odf-catalogsource")].status.connectionState.lastObservedState}')" == "READY" ]; do
  sleep 1
done
until [ ! -z "$(oc get subscription -n openshift-storage -o=jsonpath='{.items[?(@.metadata.name=="odf-operator")].status.installedCSV}')" ]; do
  sleep 1
done
EOF

# Enable console plugin for ODF-Console
export CONSOLE_CONFIG_NAME="cluster"
export ODF_PLUGIN_NAME="odf-console"

echo "Enabling Console Plugin for ODF Operator"
oc patch console.v1.operator.openshift.io ${CONSOLE_CONFIG_NAME} --type=json -p="[{'op': 'add', 'path': '/spec/plugins', 'value':["${ODF_PLUGIN_NAME}"]}]"

ODF_CONSOLE_IMAGE="$1"
export ODF_CSV_NAME="$(oc get subscription -n openshift-storage -o=jsonpath='{.items[?(@.metadata.name=="odf-operator")].status.installedCSV}')"

oc patch csv ${ODF_CSV_NAME} -n openshift-storage --type='json' -p \
  "[{'op': 'replace', 'path': '/spec/install/spec/deployments/1/spec/template/spec/containers/0/image', 'value': \"${ODF_CONSOLE_IMAGE}\"}]"

# Installation occurs.

ARTIFACT_DIR=${ARTIFACT_DIR:=/tmp/artifacts}
SCREENSHOTS_DIR=gui-test-screenshots

function generateLogsAndCopyArtifacts {
  oc cluster-info dump > ${ARTIFACT_DIR}/cluster_info.json
  oc get catalogsource -A -o wide > ${ARTIFACT_DIR}/catalogsource.yaml
  oc get catalogsource -A -o yaml >> ${ARTIFACT_DIR}/catalogsource.yaml
  oc get csvs -n openshift-storage -o wide > ${ARTIFACT_DIR}/csvs.yaml
  oc get csvs -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/csvs.yaml
  oc get deployments -n openshift-storage -o wide > ${ARTIFACT_DIR}/deployment_details.yaml
  oc get deployments -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/deployment_details.yaml
  oc get installplan -n openshift-storage -o wide > ${ARTIFACT_DIR}/installplan.yaml
  oc get installplan -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/installplan.yaml
  oc get nodes -o wide > ${ARTIFACT_DIR}/node.yaml
  oc get nodes -o yaml >> ${ARTIFACT_DIR}/node.yaml
  oc get pods -n olm -o wide > ${ARTIFACT_DIR}/pod_details_olm.yaml
  oc get pods -n olm -o yaml >> ${ARTIFACT_DIR}/pod_details_olm.yaml
  oc get pods -n openshift-storage -o wide >> ${ARTIFACT_DIR}/pod_details_openshift-storage.yaml
  oc get pods -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/pod_details_openshift-storage.yaml
  oc get storageclusters ocs-storagecluster -n openshift-storage -o wide > ${ARTIFACT_DIR}/storagecluster.yaml
  oc get storageclusters ocs-storagecluster -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/storagecluster.yaml
  oc get storagesystems -n openshift-storage -o wide > ${ARTIFACT_DIR}/storagesystem_details.yaml
  oc get storagesystems -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/storagesystem_details.yaml
  oc get subscriptions -n openshift-storage -o wide > ${ARTIFACT_DIR}/subscription_details.yaml
  oc get subscriptions -n openshift-storage -o yaml >> ${ARTIFACT_DIR}/subscription_details.yaml

  if [ -d "$ARTIFACT_DIR" ] && [ -d "$SCREENSHOTS_DIR" ]; then
    if [[ -z "$(ls -A -- "$SCREENSHOTS_DIR")" ]]; then
      echo "No artifacts were copied."
    else
      echo "Copying artifacts from $(pwd)..."
      cp -r "$SCREENSHOTS_DIR" "${ARTIFACT_DIR}/gui-test-screenshots"
    fi
  fi
}

# This is also the default case if the CSV is in "Installing" state initially.
timeout 15m bash <<-'EOF'
echo "waiting for ${ODF_CSV_NAME} clusterserviceversion to succeed"
until [ "$(oc -n openshift-storage get csv -o=jsonpath="{.items[?(@.metadata.name==\"${ODF_CSV_NAME}\")].status.phase}")" == "Succeeded" ]; do
  sleep 1
done
EOF

INSTALLER_DIR=${INSTALLER_DIR:=${ARTIFACT_DIR}/installer}

BRIDGE_KUBEADMIN_PASSWORD="$(cat "${KUBEADMIN_PASSWORD_FILE:-${INSTALLER_DIR}/auth/kubeadmin-password}")"
export BRIDGE_KUBEADMIN_PASSWORD
BRIDGE_BASE_ADDRESS="$(oc get consoles.config.openshift.io cluster -o jsonpath='{.status.consoleURL}')"
export BRIDGE_BASE_ADDRESS

# Disable color codes in Cypress since they do not render well CI test logs.
# https://docs.cypress.io/guides/guides/continuous-integration.html#Colors
export NO_COLOR=1

# Install dependencies.
yarn install

# Run tests.
yarn run test-cypress-headless

# Generate Cypress report.
yarn run cypress-postreport
