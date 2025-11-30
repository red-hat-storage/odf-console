import {
  ODF_PROXY_ROOT_PATH,
  PLUGIN_OPENSHIFT_CI,
} from '@odf/shared/constants';
import { StorageClassModel, StorageClusterModel } from '@odf/shared/models';
import { SelfSubjectAccessReviewModel } from '@odf/shared/models';
import {
  StorageClassResourceKind,
  StorageClusterKind,
} from '@odf/shared/types';
import {
  SetFeatureFlag,
  k8sList,
  k8sCreate,
  SelfSubjectAccessReviewKind,
  K8sResourceCommon,
  consoleFetchJSON,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { SECOND, NOOBAA_PROVISIONER } from './constants';
import { isExternalCluster, isClusterIgnored } from './utils';

export const ODF_MODEL_FLAG = 'ODF_MODEL'; // Based on the existence of StorageSystem CRD
export const MCG_FLAG = 'MCG'; // Based on the existence of NooBaa CR and NooBaa StorageClass
export const ODF_ADMIN = 'ODF_ADMIN'; // Set to "true" if user is an "openshift-storage" admin (access to StorageSystems)
export const PROVIDER_MODE = 'PROVIDER_MODE'; // Set to "true" if user has deployed it in provider mode

const nooBaaFlagName = 'noobaa';
type FeatureFlagResponse = {
  [flagName: string]: {
    value: boolean;
    error?: string;
  };
};

// Check the user's access to some resources.
const ssarChecks = [
  {
    flag: ODF_ADMIN,
    resourceAttributes: {
      group: StorageClusterModel.apiGroup,
      resource: StorageClusterModel.plural,
      verb: 'list',
    },
  },
];

const isProviderMode = (cluster: StorageClusterKind): boolean =>
  cluster.spec.hostNetwork;

export const setOCSFlags = async (setFlag: SetFeatureFlag) => {
  let ocsIntervalId = null;
  // to prevent unnecessary re-render every 15 sec
  // until storageClusters are found
  let setFlagFalse = true;
  const ocsDetector = async () => {
    try {
      const storageClusters: StorageClusterKind[] =
        (await k8sList<K8sResourceCommon>({
          model: StorageClusterModel,
          queryParams: { ns: null },
          requestInit: null,
        })) as StorageClusterKind[];
      if (storageClusters?.length > 0) {
        const internalStorageCluster = storageClusters.find(
          (sc: StorageClusterKind) =>
            !isClusterIgnored(sc) && !isExternalCluster(sc)
        );
        setFlag(PROVIDER_MODE, isProviderMode(internalStorageCluster));
        clearInterval(ocsIntervalId);
      } else if (setFlagFalse) {
        setFlagFalse = false;
        setFlag(PROVIDER_MODE, false);
      }
    } catch (_error) {
      setFlag(PROVIDER_MODE, false);
    }
  };

  // calling first time instantaneously
  // else it will wait for 15s before polling
  ocsDetector();
  ocsIntervalId = setInterval(ocsDetector, 15 * SECOND);
};

export const setODFFlag = (setFlag: SetFeatureFlag) =>
  setFlag(ODF_MODEL_FLAG, true);

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
    const fn = async (setFeatureFlag: SetFeatureFlag) => {
      try {
        ssar['spec'] = { resourceAttributes: ssarObj.resourceAttributes };
        const result: SelfSubjectAccessReviewKind = (await k8sCreate({
          model: SelfSubjectAccessReviewModel,
          data: ssar,
        })) as SelfSubjectAccessReviewKind;
        result.status?.allowed &&
          setFeatureFlag(ssarObj.flag, result.status?.allowed);
      } catch (error) {
        handleError(error, [ssarObj.flag], setFeatureFlag, fn, 2000);
      }
    };
    return fn;
  });

  ssarDetectors.forEach((detectorFunc) => detectorFunc(setFlag));
};

export const detectComponents: FeatureDetector = async (
  setFlag: SetFeatureFlag
) => {
  let noobaaIntervalId = null;

  // ToDo (Sanjal): Remove this once CI is upgraded to ODF 4.21 or above
  const noobaaDetectorCI = async () => {
    try {
      const storageClasses = (await k8sList({
        model: StorageClassModel,
        queryParams: { ns: null },
      })) as StorageClassResourceKind[];
      const isNooBaaPresent = storageClasses?.some((sc) =>
        sc?.provisioner?.endsWith(NOOBAA_PROVISIONER)
      );
      if (isNooBaaPresent) {
        setFlag(MCG_FLAG, true);
        clearInterval(noobaaIntervalId);
      }
    } catch {
      setFlag(MCG_FLAG, false);
    }
  };

  const noobaaDetectorProd = async () => {
    try {
      const response = (await consoleFetchJSON(
        `${ODF_PROXY_ROOT_PATH}/provider-proxy/info/featureflags?flags=${nooBaaFlagName}`
      )) as FeatureFlagResponse;
      const isNooBaaPresent = response?.[nooBaaFlagName]?.value;
      if (isNooBaaPresent) {
        setFlag(MCG_FLAG, true);
        clearInterval(noobaaIntervalId);
      }
    } catch {
      setFlag(MCG_FLAG, false);
    }
  };

  const noobaaDetector =
    PLUGIN_OPENSHIFT_CI === 'true' || PLUGIN_OPENSHIFT_CI === '1'
      ? noobaaDetectorCI
      : noobaaDetectorProd;

  // calling first time instantaneously
  // else it will wait for 15s before start polling
  noobaaDetector();
  noobaaIntervalId = setInterval(noobaaDetector, 15 * SECOND);
};

export type FeatureDetector = (setFlag: SetFeatureFlag) => Promise<void>;
