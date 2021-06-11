# ODF Console

ODF Console is the UI for Openshift Data Foundation Operator. It is a remote module for the OpenShift Console. Hence it requires OpenShift Console to function properly.

## Steps to make this work

1. Pull [badhikar-sdk-branch](https://github.com/bipuladh/console/tree/badhikar-sdk-branch) and run the console from the branch.
2. Apply [patch](https://gist.github.com/bipuladh/7b7400ee94fe0ab73297d4b167f2158b) to the above branch to link OCS Dashboard to ODF Dashboard. For IBM need to create a similar extension in IBM `console-extensions.json` file.
3. Run bridge as follows `./bin/bridge -plugins odf-console=http://localhost:9001/`
4. Run developemnt mode of console by going into `console/frontend` and running `yarn run dev`
5. Apply Storage System CRD from [here](https://gist.github.com/bipuladh/517b42efb84abc17b86d2d8f03059099)
6. For Listing OCS in the SS List apply [this](https://gist.github.com/bipuladh/b992919a2e5f66f27742340a4128a9ed). Create similar YAML for IBM System and apply if you want to list IBM System in the Dashboard.
7. Clone this repo. Build it using `yarn build-dev`
8. Run the server using `yarn http-server`
