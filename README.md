# ODF Console

ODF Console is the UI plugin for Openshift Data Foundation Operator. It works as a remote module for OpenShift Container Platform [console](<(https://github.com/openshift/console)>).

## Package Manager

This project uses **Yarn Berry (v4)** as the package manager. Yarn is managed via [Corepack](https://nodejs.org/api/corepack.html), which is included with Node.js 16.10+.

### First-time Setup

Enable Corepack (one-time setup):

```bash
corepack enable
```

### Installing Dependencies

```bash
yarn install
```

The Yarn version is specified in `package.json` under the `packageManager` field. Corepack will automatically use the correct version.

## Running in Development Mode

ODF console works as a remote bundle for OCP console. To run ODF Console there should be a instance of OCP console up and running.

### Steps to run OCP Console as a server in development mode:

1. Follow everything as mentioned in the console [README.md](https://github.com/openshift/console) to build the application.
2. Run the console bridge as follows `./bin/bridge -plugins odf-console=http://localhost:9001/`
3. Run developemnt mode of console by going into `console/frontend` and running `yarn run dev`

After the OCP console is set as required by ODF Console. Performs the following steps to make it run.

1. Install ODF Operator
2. Create a Storage System
3. Clone this repo.
4. Enable Corepack: `corepack enable` (first-time setup)
5. Pull all required dependencies by running `yarn install`.
6. Run the development mode of odf-console using `yarn run dev`. This runs a webserver in port 9001.

### Steps to run OCP Console as a container in development mode:

1. Install ODF Operator.
2. Create a Storage System.
3. Clone this repo.
4. Enable Corepack: `corepack enable` (first-time setup)
5. Pull all required dependencies by running `yarn install`.
6. Run the development mode of odf-console using `CONSOLE_VERSION=4.18 I8N_NS=plugin__odf-console PLUGIN=odf yarn run dev:c`. This runs a container running both the console bridge and a webserver in port 9001.
7. For more OCP container related environment variables [Refer](https://github.com/red-hat-storage/odf-console/scripts/start-ocp-console.sh).

### Unit Tests

Run all unit tests:

```
yarn test
# Run them with coverage:
yarn test-coverage
```

### E2E Tests

E2E tests are written in [Cypress](https://www.cypress.io/).

Launch Cypress test runner:

```
yarn test-cypress
```

This will launch the Cypress Test Runner UI, where you can run one or all cypress tests after choosing the required browser.

It is also possible to run the Cypress tests in headless mode:

```
yarn test-cypress-headless
```

By default, it will look for Chrome in the system and use it, but if you want to use Firefox instead, set BRIDGE_E2E_BROWSER_NAME environment variable in your shell with the value firefox.

### Object Browser setup

To run Object Browser in development mode, do the following:

#### ODF plugin

Port-forward the noobaa or rgw (internal) endpoint respectively to local port 6001:

```
oc port-forward $(oc get pods -n openshift-storage | grep noobaa-endpoint | awk '{print $1}') 6001 -n openshift-storage

or,

oc port-forward $(oc get pods -n openshift-storage | grep rook-ceph-rgw-ocs-storagecluster-cephobjectstore | awk '{print $1}') 6001:8080 -n openshift-storage
```

Serve the plugin choosing how to run OCP Console:

As a container:

```
CONSOLE_VERSION=4.19 BRIDGE_PLUGIN_PROXY='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-console/s3/","endpoint":"http://localhost:6001"}]}' BRIDGE_PLUGINS='odf-console=http://localhost:9001' PLUGIN=odf I8N_NS=plugin__odf-console yarn dev:c

or,

CONSOLE_VERSION=4.19 BRIDGE_PLUGIN_PROXY='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-console/internalRgwS3/","endpoint":"http://localhost:6001"}]}' BRIDGE_PLUGINS='odf-console=http://localhost:9001' PLUGIN=odf I8N_NS=plugin__odf-console yarn dev:c
```

Locally:

```
./bin/bridge -plugins odf-console=http://localhost:9001/ --plugin-proxy='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-console/s3/","endpoint":"http://localhost:6001/"}]}'

or,

./bin/bridge -plugins odf-console=http://localhost:9001/ --plugin-proxy='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-console/internalRgwS3/","endpoint":"http://localhost:6001/"}]}'
```

To see the NooBaa or RGW (internal) S3 logs respectively: `oc logs -f deploy/noobaa-endpoint` or `oc logs -f deploy/rook-ceph-rgw-ocs-storagecluster-cephobjectstore`

#### Client plugin (outdated, placeholder purpose only)

Deploy a forward proxy:

```
oc apply -f ./plugins/client/dev/s3-forward-proxy.yaml
```

Port-forward the forward proxy to local port 6001:

```
oc port-forward $(oc get pods -n openshift-storage | grep s3-forward-proxy | awk '{print $1}') 6001:8080 -n openshift-storage
```

Serve the plugin choosing how to run OCP Console:

As a container:

```
CONSOLE_VERSION=4.19 BRIDGE_PLUGIN_PROXY='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-client-console/s3/","endpoint":"http://localhost:6001"}]}' BRIDGE_PLUGINS='odf-client-console=http://localhost:9001' PLUGIN=client I8N_NS=plugin__odf-client-console yarn dev:c
```

Locally:

```
./bin/bridge -plugins odf-client-console=http://localhost:9001/ --plugin-proxy='{"services":[{"consoleAPIPath":"/api/proxy/plugin/odf-client-console/s3/","endpoint":"http://localhost:6001/"}]}'
```

### Debugging with VSCode

To debug with VSCode breakpoints, do the following:

- Run: `yarn dev:c`
- To display the value of the variables inline, add this to your _settings.json_:

  ```
  "debug.inlineValues": "on"
  ```

  This setting also works with the `debugger;` statement.

- Create a _launch.json_ file from the template:

  ```
  cp .vscode/launch.{template.json,json}
  ```

- Set _webRoot_: your _odf-console_ directory path. Check if the template value works for you.
- Set a breakpoint in the code.
- Go to _Run and Debug_ panel, select "_Debug odf-console_" and start debugging.

  A Google Chrome instance will be launched.

- Interact with the browser until you reach the breakpoint.

## Build the CI plugin image

Build a plugin image for testing purposes:

```
# odf plugin.
docker build -t quay.io/<username>/odf-console:test -f Dockerfile.ci . --build-arg OPENSHIFT_CI=false
# client plugin.
docker build -t quay.io/<username>/ocs-client-console:test -f Dockerfile.ci . --build-arg PLUGIN=client --build-arg OPENSHIFT_CI=false
# mco plugin.
docker build -t quay.io/<username>/odf-multicluster-console:test -f Dockerfile.ci . --build-arg PLUGIN=mco --build-arg OPENSHIFT_CI=false
```

Push it:

```
docker push quay.io/<username>/odf-console:test
```

After pushing you can replace the cluster's console plugin image with your test image.

## Build the CI runner image

Build a beta for testing:

```
docker build -t quay.io/ocs-dev/odf-console-ci-runner:beta -f Dockerfile.ci.runner .
```

Push it:

```
docker push quay.io/ocs-dev/odf-console-ci-runner:beta
```

Only for testing purposes (don't merge this), add a separate commit updating `.ci-operator.yaml`:
`tag: beta`
