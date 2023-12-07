import {
  ODFStorageSystem,
  OCSStorageClusterModel,
  StorageClassModel,
  CephClusterModel,
} from '@odf/shared/models';
import { SelfSubjectAccessReviewModel } from '@odf/shared/models';
import {
  StorageClusterKind,
  StorageClassResourceKind,
} from '@odf/shared/types';
import {
  SetFeatureFlag,
  k8sList,
  k8sCreate,
  K8sResourceCommon,
  SelfSubjectAccessReviewKind,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash-es';
import { SECOND, RGW_PROVISIONER, NOOBAA_PROVISIONER } from './constants';

export const ODF_MODEL_FLAG = 'ODF_MODEL'; // Based on the existence of StorageSystem CRD
export const OCS_INDEPENDENT_FLAG = 'OCS_INDEPENDENT'; // Set to "true" if it is external mode StorageCluster
export const OCS_CONVERGED_FLAG = 'OCS_CONVERGED'; // Set to "true" if it is internal mode StorageCluster
export const ROSA_FLAG = 'ROSA'; // Set to "true" if we are using ROSA
export const RGW_FLAG = 'RGW'; // Based on the existence of StorageClass with RGW provisioner ("openshift-storage.ceph.rook.io/bucket")
export const MCG_STANDALONE = 'MCG_STANDALONE'; // Based on the existence of NooBaa only system (no Ceph)
export const MCG_FLAG = 'MCG'; // Based on the existence of NooBaa StorageClass (which only gets created if NooBaaSystem is present)
export const CEPH_FLAG = 'CEPH'; // Based on the existence of CephCluster
export const OCS_FLAG = 'OCS'; // Based on the existence of StorageCluster
export const OCS_NFS_ENABLED = 'NFS'; // Based on the enablement of NFS from StorageCluster spec
export const ODF_ADMIN = 'ODF_ADMIN'; // Set to "true" if user is an "openshift-storage" admin (access to StorageSystems)

// Check the user's access to some resources.
const ssarChecks = [
  {
    flag: ODF_ADMIN,
    resourceAttributes: {
      group: ODFStorageSystem.apiGroup,
      resource: ODFStorageSystem.plural,
      verb: 'list',
    },
  },
];

const setOCSFlagsFalse = (setFlag: SetFeatureFlag) => {
  setFlag(OCS_FLAG, false);
  setFlag(OCS_CONVERGED_FLAG, false);
  setFlag(OCS_INDEPENDENT_FLAG, false);
  setFlag(MCG_STANDALONE, false);
  setFlag(OCS_NFS_ENABLED, false);
};

export const setODFFlag = (setFlag: SetFeatureFlag) =>
  setFlag(ODF_MODEL_FLAG, true);

export const setOCSFlags = async (setFlag: SetFeatureFlag) => {
  let ocsIntervalId = null;
  // to prevent unnecessary re-render every 15 sec
  // until storageClusters are found
  let setFlagFalse = true;
  const ocsDetector = async () => {
    try {
      const storageClusters: StorageClusterKind[] =
        (await k8sList<K8sResourceCommon>({
          model: OCSStorageClusterModel,
          queryParams: { ns: null },
          requestInit: null,
        })) as StorageClusterKind[];
      if (storageClusters?.length > 0) {
        const storageCluster = storageClusters.find(
          (sc: StorageClusterKind) => sc.status.phase !== 'Ignored'
        );
        const isInternal = _.isEmpty(storageCluster?.spec?.externalStorage);
        setFlag(OCS_CONVERGED_FLAG, isInternal);
        setFlag(OCS_INDEPENDENT_FLAG, !isInternal);
        setFlag(OCS_FLAG, true);
        setFlag(
          MCG_STANDALONE,
          storageCluster?.spec?.multiCloudGateway?.reconcileStrategy ===
            'standalone'
        );
        setFlag(OCS_NFS_ENABLED, storageCluster?.spec?.nfs?.enable === true);
        clearInterval(ocsIntervalId);
      } else if (setFlagFalse) {
        setFlagFalse = false;
        setOCSFlagsFalse(setFlag);
      }
    } catch (error) {
      setOCSFlagsFalse(setFlag);
    }
  };

  // calling first time instantaneously
  // else it will wait for 15s before polling
  ocsDetector();
  ocsIntervalId = setInterval(ocsDetector, 15 * SECOND);
};

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

// To be Run only once the Storage Cluster is Installed
// RGW storageClass should init. first => Noobaa consumes RGW to create a backingStore
// Stops polling when either the RGW storageClass or the Noobaa Storage Class comes up
export const detectRGW: FeatureDetector = async (setFlag: SetFeatureFlag) => {
  let id = null;
  let isInitial = true;
  const logicHandler = () =>
    k8sList({ model: StorageClassModel, queryParams: { ns: null } })
      .then((data: StorageClassResourceKind[]) => {
        const isRGWPresent = data.some((sc) =>
          sc.provisioner?.endsWith(RGW_PROVISIONER)
        );
        const isNooBaaPresent = data.some((sc) =>
          sc.provisioner?.endsWith(NOOBAA_PROVISIONER)
        );
        if (isRGWPresent) {
          setFlag(RGW_FLAG, true);
          clearInterval(id);
        } else {
          if (isInitial === true) {
            setFlag(RGW_FLAG, false);
            isInitial = false;
          }
          // If Noobaa already has come up; Platform doesn't support RGW; stop polling
          if (isNooBaaPresent) {
            clearInterval(id);
          }
        }
      })
      .catch((error) => {
        if (error?.response instanceof Response) {
          const status = error?.response?.status;
          if (_.includes([403, 502], status)) {
            setFlag(RGW_FLAG, false);
            clearInterval(id);
          }
          if (!_.includes([401, 403, 500], status) && isInitial === true) {
            setFlag(RGW_FLAG, false);
            isInitial = false;
          }
        } else {
          clearInterval(id);
        }
      });
  id = setInterval(logicHandler, 15 * SECOND);
};

// ToDo: Add logic to detect ROSA environment here
export const detectROSA: FeatureDetector = async (setFlag: SetFeatureFlag) =>
  setFlag(ROSA_FLAG, false);

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
  let cephIntervalId = null;
  let noobaaIntervalId = null;

  const cephDetector = async () => {
    try {
      const cephClusters = (await k8sList({
        model: CephClusterModel,
        queryParams: { ns: null },
      })) as K8sResourceCommon[];
      if (cephClusters?.length > 0) {
        setFlag(CEPH_FLAG, true);
        clearInterval(cephIntervalId);
      }
    } catch {
      setFlag(CEPH_FLAG, false);
    }
  };

  // Setting flag based on presence of NooBaa StorageClass gets created only if NooBaa CR is present
  const noobaaDetector = async () => {
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

  // calling first time instantaneously
  // else it will wait for 15s before start polling
  cephDetector();
  noobaaDetector();
  cephIntervalId = setInterval(cephDetector, 15 * SECOND);
  noobaaIntervalId = setInterval(noobaaDetector, 15 * SECOND);
};

export type FeatureDetector = (setFlag: SetFeatureFlag) => Promise<void>;
