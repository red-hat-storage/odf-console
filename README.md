# ODF Console

ODF Console is the UI plugin for Openshift Data Foundation Operator. It works as a remote module for OpenShift Container Platform [console](<(https://github.com/openshift/console)>).

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
4. Pull all required dependencies by running `yarn install`.
5. Run the development mode of odf-console using `yarn run dev`. This runs a webserver in port 9001.

### Steps to run OCP Console as a container in development mode:

1. Install ODF Operator.
2. Create a Storage System.
3. Clone this repo.
4. Pull all required dependencies by running `yarn install`.
5. Run the development mode of odf-console using `I8N_NS=plugin__odf-console PLUGIN=odf yarn run dev:c`. This runs a container running both the console bridge and a webserver in port 9001.
6. For more OCP container related environment variables refer the [script](https://github.com/red-hat-storage/odf-console/scripts/start-ocp-console.sh).

## Unit Tests

Run all unit tests:

```
yarn test
# Run them with coverage:
yarn test-coverage
```

## E2E Tests

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

## Redux

- Console's redux store is accessed via an extension point [console.redux-reducer](https://github.com/openshift/console/blob/master/frontend/packages/console-dynamic-plugin-sdk/docs/console-extensions.md#consoleredux-reducer), refer the [file](https://github.com/red-hat-storage/odf-console/blob/master/plugins/odf/console-extensions.json).
- Currently we inject 2 [reducers](https://github.com/red-hat-storage/odf-console/tree/master/packages/odf/redux/reducers):
  1.  `odfNamespaceReducer`: For storing the Namespace where ODF operator is installed.
  2.  `odfSystemFlagsReducer`: For setting the feature flags, used for enabling/disabling certain console components.

**Note:**

1. Only rely on the redux store if data needs to be accessed by multiple un-related components. Whereever possible use [Context](https://legacy.reactjs.org/docs/context.html) API instead.
2. [useODFSystemFlags](https://github.com/red-hat-storage/odf-console/blob/master/packages/odf/redux/provider-hooks/useODFSystemFlags.ts#L32) hook opens up certain websocket connections as soon as plugin is enabled. Utilize these at different places (example: dashboard, wizard etc) and poll for entire list of `StorageCluster`, `CephCluster`, `CephObjectStore` and `NooBaa` CRs and filter later.
