import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { SelfSubjectAccessReviewModel } from '@odf/shared/models';
import {
  SetFeatureFlag,
  k8sCreate,
  SelfSubjectAccessReviewKind,
} from "@openshift-console/dynamic-plugin-sdk";
import * as _ from 'lodash';
import { ODFStorageSystem } from '../odf/models';

const ODF_MODEL_FLAG = 'ODF_MODEL';
// Set to "true" if user is an "openshift-storage" admin (access to StorageSystems)
export const ODF_ADMIN = 'ODF_ADMIN';

// Check the user's access to some resources.
const ssarChecks = [
  {
    flag: ODF_ADMIN,
    resourceAttributes: {
      group: ODFStorageSystem.apiGroup,
      resource: ODFStorageSystem.plural,
      verb: 'list',
      namespace: CEPH_STORAGE_NAMESPACE,
    },
  },
];

export const setODFFlag = (setFlag: SetFeatureFlag) => setFlag(ODF_MODEL_FLAG, true);

const handleError = (
  res: any,
  flags: string[],
  setFlag: SetFeatureFlag,
  cb: FeatureDetector,
  duration = 15000
) => {
  if (res?.response instanceof Response) {
    const status = res?.response?.status;
    if (_.includes([403, 502], status)) {
      flags.forEach((feature) => {
        setFlag(feature, undefined);
      });
    }
    if (!_.includes([401, 403, 500], status)) {
      setTimeout(() => cb(setFlag), duration);
    }
  } else {
    flags.forEach((feature) => {
      setFlag(feature, undefined);
    });
  }
};

export const detectSSAR = (setFlag: SetFeatureFlag) => {
  const ssar = {
    apiVersion: 'authorization.k8s.io/v1',
    kind: 'SelfSubjectAccessReview',
  };
  const ssarDetectors: FeatureDetector[] = ssarChecks.map((ssarObj) => {
    const fn = async (setFlag: SetFeatureFlag) => {
      try {
        ssar['spec'] = { resourceAttributes: ssarObj.resourceAttributes };
        const result: SelfSubjectAccessReviewKind = (await k8sCreate({
          model: SelfSubjectAccessReviewModel,
          data: ssar,
        })) as SelfSubjectAccessReviewKind;
        result.status?.allowed && setFlag(ssarObj.flag, result.status?.allowed);
      } catch (error) {
        handleError(error, [ssarObj.flag], setFlag, fn, 2000);
      }
    };
    return fn;
  });

  ssarDetectors.forEach((detectorFunc) => detectorFunc(setFlag));
};

export type FeatureDetector = (setFlag: SetFeatureFlag) => Promise<void>;
