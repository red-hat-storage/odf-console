# ODF Console

ODF Console is the UI plugin for Openshift Data Foundation Operator. It works as a remote module for OpenShift Container Platform [console](<(https://github.com/openshift/console)>).

## Running in Development Mode

ODF console works as a remote bundle for OCP console. To run ODF Console there should be a instance of OCP console up and running.
Follow these steps to run OCP Console in development mode:

1. Follow everything as mentioned in the console [README.md](https://github.com/openshift/console) to build the application.
2. Run the console bridge as follows `./bin/bridge -plugins odf-console=http://localhost:9001/`
3. Run developemnt mode of console by going into `console/frontend` and running `yarn run dev`

After the OCP console is set as required by ODF Console. Performs the following steps to make it run.

1. Install ODF Operator
2. Create a Storage System
3. Clone this repo.
4. Pull all required dependencies by running `yarn install`.
5. Run the development mode of odf-console using `yarn run dev`. This runs a webserver in port 9001.
