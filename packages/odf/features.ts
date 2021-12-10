import { SetFeatureFlag } from "@openshift-console/dynamic-plugin-sdk";

export const ODF_MODEL_FLAG = 'ODF_MODEL';

export const setODFFlag = (setFlag: SetFeatureFlag) => setFlag(ODF_MODEL_FLAG, true);
