import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import {
  OCSStorageClusterModel,
  StorageClassModel,
  NamespaceModel,
  CephClusterModel,
  ClusterServiceVersionModel,
} from '@odf/shared/models';
import { getAnnotations, getName } from '@odf/shared/selectors';
import {
  ListKind,
  StorageClusterKind,
  StorageClassResourceKind,
  ClusterServiceVersionKind,
} from '@odf/shared/types';
import {
  SetFeatureFlag,
  k8sGet,
  k8sList,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import {
  SECOND,
  OCS_OPERATOR,
  RGW_PROVISIONER,
  NOOBAA_PROVISIONER,
  ODF_MANAGED_LABEL,
  OCS_SUPPORT_ANNOTATION,
  OCS_DISABLED_ANNOTATION,
} from './constants';
import { NooBaaSystemModel } from './models';

export const ODF_MODEL_FLAG = 'ODF_MODEL';
export const OCS_INDEPENDENT_FLAG = 'OCS_INDEPENDENT';
export const OCS_CONVERGED_FLAG = 'OCS_CONVERGED';
export const ODF_MANAGED_FLAG = 'ODF_MANAGED';
export const LSO_FLAG = 'LSO';
export const RGW_FLAG = 'RGW';
export const MCG_STANDALONE = 'MCG_STANDALONE';
// Based on the existence of NooBaaSystem
export const MCG_FLAG = 'MCG';
// Based on the existence of CephCluster
export const CEPH_FLAG = 'CEPH';
// Based on the existence of StorageCluster
export const OCS_FLAG = 'OCS';

export enum FEATURES {
  // Flag names to be prefixed with "OCS_" so as to seperate from console flags
  OCS_MULTUS = 'OCS_MULTUS',
  OCS_ARBITER = 'OCS_ARBITER',
  OCS_KMS = 'OCS_KMS',
  OCS_FLEXIBLE_SCALING = 'OCS_FLEXIBLE_SCALING',
  OCS_TAINT_NODES = 'OCS_TAINT_NODES',
  OCS_THICK_PROVISION = 'OCS_THICK_PROVISION',
  OCS_POOL_MANAGEMENT = 'OCS_POOL_MANAGEMENT',
  OCS_NAMESPACE_STORE = 'OCS_NAMESPACE_STORE',
  ODF_MCG_STANDALONE = 'ODF_MCG_STANDALONE',
  ODF_HPCS_KMS = 'ODF_HPCS_KMS',
  ODF_VAULT_SA_KMS = 'ODF_VAULT_SA_KMS',
  SS_LIST = 'ODF_SS_LIST',
  ADD_CAPACITY = 'ODF_ADD_CAPACITY',
  ODF_WIZARD = 'ODF_WIZARD',
  BLOCK_POOL = 'BLOCK_POOL',
  MCG_RESOURCE = 'MCG_RESOURCE',
  ODF_DASHBOARD = 'ODF_DASHBOARD',
  COMMON_FLAG = 'COMMON_FLAG',
}

export const OCS_FEATURE_FLAGS = {
  // [flag name]: <value of flag in csv annotation>
  [FEATURES.OCS_MULTUS]: 'multus',
  [FEATURES.OCS_ARBITER]: 'arbiter',
  [FEATURES.OCS_KMS]: 'kms',
  [FEATURES.OCS_FLEXIBLE_SCALING]: 'flexible-scaling',
  [FEATURES.OCS_TAINT_NODES]: 'taint-nodes',
  [FEATURES.OCS_THICK_PROVISION]: 'thick-provision',
  [FEATURES.OCS_POOL_MANAGEMENT]: 'pool-management',
  [FEATURES.OCS_NAMESPACE_STORE]: 'namespace-store',
  [FEATURES.ODF_MCG_STANDALONE]: 'mcg-standalone',
  [FEATURES.ODF_HPCS_KMS]: 'hpcs-kms',
  [FEATURES.ODF_VAULT_SA_KMS]: 'vault-sa-kms',
};

export const ODF_BLOCK_FLAG = {
  [FEATURES.SS_LIST]: 'ss-list',
  [FEATURES.ADD_CAPACITY]: 'add-capacity',
  [FEATURES.ODF_WIZARD]: 'install-wizard',
  [FEATURES.BLOCK_POOL]: 'block-pool',
  [FEATURES.MCG_RESOURCE]: 'mcg-resource',
  [FEATURES.ODF_DASHBOARD]: 'odf-dashboard',
  [FEATURES.COMMON_FLAG]: 'common',
};

const setOCSFlagsFalse = (setFlag: SetFeatureFlag) => {
  setFlag(OCS_FLAG, false);
  setFlag(OCS_CONVERGED_FLAG, false);
  setFlag(OCS_INDEPENDENT_FLAG, false);
  setFlag(MCG_STANDALONE, false);
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
          queryParams: { CEPH_STORAGE_NAMESPACE },
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
  cb: FeatureDetector
) => {
  if (res?.response instanceof Response) {
    const status = res?.response?.status;
    if (_.includes([403, 502], status)) {
      flags.forEach((feature) => {
        setFlag(feature, undefined);
      });
    }
    if (!_.includes([401, 403, 500], status)) {
      setTimeout(() => cb(setFlag), 15000);
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
        const isRGWPresent = data.some(
          (sc) => sc.provisioner === RGW_PROVISIONER
        );
        const isNooBaaPresent = data.some(
          (sc) => sc.provisioner === NOOBAA_PROVISIONER
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

export const detectManagedODF: FeatureDetector = async (
  setFlag: SetFeatureFlag
) => {
  try {
    const ns = await k8sGet({
      model: NamespaceModel,
      name: CEPH_STORAGE_NAMESPACE,
    });
    if (ns) {
      const isManagedCluster = ns?.metadata?.labels?.[ODF_MANAGED_LABEL];
      setFlag(ODF_MANAGED_FLAG, !!isManagedCluster);
    }
  } catch (error) {
    setFlag(ODF_MANAGED_FLAG, false);
  }
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
        queryParams: { ns: CEPH_STORAGE_NAMESPACE },
      })) as K8sResourceCommon[];
      if (cephClusters?.length > 0) {
        setFlag(CEPH_FLAG, true);
        clearInterval(cephIntervalId);
      }
    } catch {
      setFlag(CEPH_FLAG, false);
    }
  };
  const noobaaDetector = async () => {
    try {
      const noobaaSystems = (await k8sList({
        model: NooBaaSystemModel,
        queryParams: { ns: CEPH_STORAGE_NAMESPACE },
      })) as K8sResourceCommon[];
      if (noobaaSystems?.length > 0) {
        setFlag(MCG_FLAG, true);
        clearInterval(noobaaIntervalId);
        clearInterval(cephIntervalId);
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

const detectFeatures = (
  setFlag: SetFeatureFlag,
  csv: ClusterServiceVersionKind
) => {
  const support = JSON.parse(getAnnotations(csv)?.[OCS_SUPPORT_ANNOTATION]);
  _.keys(OCS_FEATURE_FLAGS).forEach((feature) => {
    setFlag(feature, support.includes(OCS_FEATURE_FLAGS[feature]));
  });

  const disabled = JSON.parse(
    getAnnotations(csv)?.[OCS_DISABLED_ANNOTATION] || '[]'
  );
  _.keys(ODF_BLOCK_FLAG).forEach((feature) => {
    setFlag(feature, disabled.includes(ODF_BLOCK_FLAG[feature]));
  });
};

export const detectOCSSupportedFeatures: FeatureDetector = async (
  setFlag: SetFeatureFlag
) => {
  try {
    const csvList = (await k8sGet({
      model: ClusterServiceVersionModel,
      ns: CEPH_STORAGE_NAMESPACE,
    })) as ListKind<ClusterServiceVersionKind>;
    const ocsCSV = csvList.items.find((obj) =>
      _.startsWith(getName(obj), OCS_OPERATOR)
    );
    if (ocsCSV) {
      detectFeatures(setFlag, ocsCSV);
    } else {
      // If OCS CSV is not present then poll
      setTimeout(() => detectOCSSupportedFeatures(setFlag), 15 * SECOND);
    }
  } catch (error) {
    handleError(
      error,
      _.keys(OCS_FEATURE_FLAGS),
      setFlag,
      detectOCSSupportedFeatures
    );
  }
};

export type FeatureDetector = (setFlag: SetFeatureFlag) => Promise<void>;
