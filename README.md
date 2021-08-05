# ODF Console

ODF Console is the UI plugin for Openshift Data Foundation Operator. It works as a remote application for OpenShift Container Platform console which inturn is the host application.

## Running in Development Mode

This application works as remote application for OCP Console so we have to first setup the OCP Console.
The steps related to running OCP Console with our patches are as follows:

1. Pull [run-console-branch](https://github.com/bipuladh/console/tree/run-console-branch) and run the console from the branch. (Until the SDK package is complete)
2. Follow everything as mentioned in the console [README.md](https://github.com/openshift/console) to build the application.
3. Run the console bridge as follows `./bin/bridge -plugins odf-console=http://localhost:9001/`
4. Run developemnt mode of console by going into `console/frontend` and running `yarn run dev`

After the OCP console is set as required by ODF Console. Performs the following steps to make it run.

1. Install ODF Operator
2. Create a Storage System
3. Clone this repo.
4. Pull all required dependencies by running `yarn install`.
5. Run the development mode of this plugin using `yarn run dev`. This runs a webserver in port 9001.
