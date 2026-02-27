#!/usr/bin/env bash

set -eExuo pipefail

if [ $# -eq 0 ]
  then
    echo "odf-console image not provided"
    echo "exiting..."
    exit 1
fi

wait_for_crd() {
  local crd_name="$1"
  local timeout="${2:-300}"  # default timeout: 300 seconds (5 mins)
  local interval="${3:-10}"  # default check interval: 10 seconds
  local elapsed=0

  echo "Waiting for CRD '$crd_name' to be available..."

  while ! oc get crd "$crd_name" > /dev/null 2>&1; do
    if [ $elapsed -ge $timeout ]; then
      echo "Timeout reached: CRD '$crd_name' not available after $timeout seconds."
      return 1
    fi
    echo "Still waiting... retrying in $interval seconds"
    sleep $interval
    elapsed=$((elapsed + interval))
  done

  echo "CRD '$crd_name' is now available!"
  return 0
}

function generateLogsAndCopyArtifacts {
  oc cluster-info dump > "${ARTIFACT_DIR}"/cluster_info.json
  oc get secrets -A -o wide > "${ARTIFACT_DIR}"/secrets.yaml
  oc get secrets -A -o yaml >> "${ARTIFACT_DIR}"/secrets.yaml
  oc get catalogsource -A -o wide > "${ARTIFACT_DIR}"/catalogsource.yaml
  oc get catalogsource -A -o yaml >> "${ARTIFACT_DIR}"/catalogsource.yaml
  oc get subscriptions -n openshift-storage -o wide > "${ARTIFACT_DIR}"/subscription_details.yaml
  oc get subscriptions -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/subscription_details.yaml
  oc get csvs -n openshift-storage -o wide > "${ARTIFACT_DIR}"/csvs.yaml
  oc get csvs -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/csvs.yaml
  oc get deployments -n openshift-storage -o wide > "${ARTIFACT_DIR}"/deployment_details.yaml
  oc get deployments -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/deployment_details.yaml
  oc get installplan -n openshift-storage -o wide > "${ARTIFACT_DIR}"/installplan.yaml
  oc get installplan -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/installplan.yaml
  oc get nodes -o wide > "${ARTIFACT_DIR}"/node.yaml
  oc get nodes -o yaml >> "${ARTIFACT_DIR}"/node.yaml
  oc get pods -n openshift-storage -o wide >> "${ARTIFACT_DIR}"/pod_details_openshift-storage.yaml
  oc get pods -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/pod_details_openshift-storage.yaml
  wait_for_crd "storageclusters.ocs.openshift.io" 300 10 || exit 1
  oc get StorageCluster --ignore-not-found=true -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/storage-cluster.yaml
  wait_for_crd "noobaas.noobaa.io" 300 10 || exit 1
  oc get NooBaa --ignore-not-found=true -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/noobaa.yaml
  oc logs --previous=false deploy/odf-operator-controller-manager manager -n openshift-storage > "${ARTIFACT_DIR}"/odf.logs
  for pod in $(oc get pods -n "${NS}" --no-headers -o custom-columns=":metadata.name" | grep "odf-console"); do
        echo "$pod" 
        oc logs --previous=false "$pod" -n "${NS}" > "${ARTIFACT_DIR}"/"${pod}".logs
  done
  oc get serviceaccounts -n openshift-storage -o wide > "${ARTIFACT_DIR}"/serviceaccount.yaml
  oc get serviceaccounts -n openshift-storage -o yaml >> "${ARTIFACT_DIR}"/serviceaccount.yaml
  oc get console.v1.operator.openshift.io cluster -o yaml >> "${ARTIFACT_DIR}"/cluster.yaml
  
  if [ -d "$ARTIFACT_DIR" ] && [ -d "$SCREENSHOTS_DIR" ]; then
    if [[ -z "$(ls -A -- "$SCREENSHOTS_DIR")" ]]; then
      echo "No artifacts were copied."
    else
      echo "Copying artifacts from $(pwd)..."
      cp -r "$SCREENSHOTS_DIR" "${ARTIFACT_DIR}/gui-test-screenshots"
    fi
  fi
}

trap generateLogsAndCopyArtifacts EXIT
trap generateLogsAndCopyArtifacts ERR

NS="openshift-storage"
ARTIFACT_DIR=${ARTIFACT_DIR:=/tmp/artifacts}
SCREENSHOTS_DIR=gui-test-screenshots

oc patch operatorhub.config.openshift.io/cluster -p='{"spec":{"sources":[{"disabled":true,"name":"redhat-operators"}]}}' --type=merge

function patchPullSecret {
  oc get -n openshift-config secret/pull-secret -ojson | jq -r '.data.".dockerconfigjson"' | base64 -d | jq '.' > secret.json
  jq -c '.auths."quay.io".auth = "'${PULL_SECRET}'"' secret.json > temp-auth.json
  jq '.auths."quay.io".email |=""' temp-auth.json > temp-secret.json
  oc set data secret/pull-secret -n openshift-config --from-file=.dockerconfigjson=temp-secret.json

  rm temp-secret.json temp-auth.json secret.json

  echo "Added Pull Secret"
}

echo "Updating the pull secret"
patchPullSecret

oc apply -f openshift-ci/odf-catalog-source.yaml ;

echo "Waiting for CatalogSource to be Ready"
timeout 10m bash <<-'EOF'
until [ "$(oc -n openshift-marketplace get catalogsource -o=jsonpath="{.items[?(@.metadata.name==\"redhat-operators\")].status.connectionState.lastObservedState}")" == "READY" ]; do
  sleep 1
done
EOF

echo "Waiting for Catalog image's pod to be running"
timeout 5m bash <<-'EOF'
until [ "$(oc get pod -n openshift-storage rhceph-dev-icsp -o=jsonpath="{.status.phase}")" == "Running" ]; do
  sleep 1
done
EOF

echo "Creating ImageContentSourcePolicy rules needed for ODF"
oc exec -it --namespace openshift-storage rhceph-dev-icsp -- cat /icsp.yaml | oc apply -f -

# Enable console plugin for ODF-Console
export CONSOLE_CONFIG_NAME="cluster"
export ODF_PLUGIN_NAME="odf-console"

echo "Enabling Console Plugin for ODF Operator"
oc patch console.v1.operator.openshift.io ${CONSOLE_CONFIG_NAME} --type=json -p="[{'op': 'add', 'path': '/spec/plugins', 'value':[${ODF_PLUGIN_NAME}]}]"

ODF_CONSOLE_IMAGE="$1"

echo "Waiting for CSV to exist"
timeout 5m bash <<-'EOF'
until [ ! -z "$(oc get csv -n openshift-storage -o=jsonpath='{.items[?(@.spec.displayName=="OpenShift Data Foundation")].metadata.name}')" ]; do
  sleep 1
done
EOF

# [SC2155]
ODF_CSV_NAME="$(oc get csv -n openshift-storage -o=jsonpath='{.items[?(@.spec.displayName=="OpenShift Data Foundation")].metadata.name}')"
export ODF_CSV_NAME

oc patch csv "${ODF_CSV_NAME}" -n openshift-storage --type='json' -p \
  "[{'op': 'replace', 'path': '/spec/install/spec/deployments/1/spec/template/spec/containers/0/image', 'value': \"${ODF_CONSOLE_IMAGE}\"}]"

# Installation occurs.
# This is also the default case if the CSV is in "Installing" state initially.
timeout 15m bash <<-'EOF'
echo "waiting for ${ODF_CSV_NAME} clusterserviceversion to succeed"
until [ "$(oc -n openshift-storage get csv -o=jsonpath="{.items[?(@.metadata.name==\"${ODF_CSV_NAME}\")].status.phase}")" == "Succeeded" ]; do
  sleep 1
done
EOF

# Check the status of the odf-console container. Sometimes even if the csv has succeeded (and the odf-console pod status phase is 'Running'),
# the odf-console container can have an unhealthy status (so the E2E tests will fail).
odf_console_container_status=""
for pod in $(oc get pods -n "${NS}" --no-headers -o custom-columns=":metadata.name" | grep "odf-console"); do
  odf_console_container_status="$(oc -n openshift-storage get pod -o jsonpath='{.status.containerStatuses[0].state}' ${pod} | jq -r 'keys'[0])"
  echo "${pod} container status: ${odf_console_container_status}"
  if [[ "${odf_console_container_status}" == "running" ]]; then
    break;
  fi
done
if [[ "${odf_console_container_status}" != "running" ]]; then
  echo "ERROR: odf-console container is not running."
  exit 1
fi

INSTALLER_DIR=${INSTALLER_DIR:=${ARTIFACT_DIR}/installer}

BRIDGE_KUBEADMIN_PASSWORD="$(cat "${KUBEADMIN_PASSWORD_FILE:-${INSTALLER_DIR}/auth/kubeadmin-password}")"
export BRIDGE_KUBEADMIN_PASSWORD
BRIDGE_BASE_ADDRESS="$(oc get consoles.config.openshift.io cluster -o jsonpath='{.status.consoleURL}')"
export BRIDGE_BASE_ADDRESS
OAUTH_BASE_ADDRESS="$(oc get route -n openshift-authentication oauth-openshift -o jsonpath='{.spec.host}')"
export OAUTH_BASE_ADDRESS

# Disable color codes in Cypress since they do not render well CI test logs.
# https://docs.cypress.io/guides/guides/continuous-integration.html#Colors
export NO_COLOR=1

# Enable Corepack for Yarn Berry
corepack enable

# Install dependencies with immutable installs disabled for CI
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
yarn install

# Run tests.
yarn run test-cypress-headless

# Generate Cypress report.
yarn run cypress-postreport
