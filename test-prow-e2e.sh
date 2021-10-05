#!/usr/bin/env bash

set -exuo pipefail

if [ $# -eq 0 ]
  then
    echo "odf-console image not provided"
    echo "exiting..."
    exit 1
fi

# Enable console plugin for ODF-Console
export CONSOLE_CONFIG_NAME="cluster"
export ODF_PLUGIN_NAME="odf-console"

echo "Enabling Console Plugin for ODF Operator"
oc patch console.v1.operator.openshift.io ${CONSOLE_CONFIG_NAME} --type=json -p="[{'op': 'add', 'path': '/spec/plugins', 'value':["${ODF_PLUGIN_NAME}"]}]"

ODF_CONSOLE_IMAGE="$1"
export ODF_CSV_NAME="$(oc get csv -n openshift-storage -o=jsonpath='{.items[?(@.spec.displayName=="OpenShift Data Foundation")].metadata.name}')"

oc patch csv ${ODF_CSV_NAME} -n openshift-storage --type='json' -p \
  "[{'op': 'replace', 'path': '/spec/install/spec/deployments/1/spec/template/spec/containers/0/image', 'value': \"${ODF_CONSOLE_IMAGE}\"}]"

# Installation occurs.

# This is also the default case if the CSV is in "Installing" state initially.
timeout 500 bash <<-'EOF'
echo "waiting for ${ODF_CSV_NAME} clusterserviceversion to succeed"
until [ "$(oc -n openshift-storage get csv -o=jsonpath="{.items[?(@.metadata.name==\"${ODF_CSV_NAME}\")].status.phase}")" == "Succeeded" ]; do
  sleep 1
done
EOF

ARTIFACT_DIR=${ARTIFACT_DIR:=/tmp/artifacts}
SCREENSHOTS_DIR=gui-test-screenshots
INSTALLER_DIR=${INSTALLER_DIR:=${ARTIFACT_DIR}/installer}

function copyArtifacts {
  if [ -d "$ARTIFACT_DIR" ] && [ -d "$SCREENSHOTS_DIR" ]; then
    echo "Copying artifacts from $(pwd)..."
    cp -r "$SCREENSHOTS_DIR" "${ARTIFACT_DIR}/gui-test-screenshots"
  fi
}

trap copyArtifacts EXIT

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
