import { OCSStorageClusterModel } from '@odf/core/models';
import { ACM_OBSERVABILITY_NS, ACM_WHITELISTING_METRICS_CONFIG_MAP, ODF_METRICS_LABEL  } from '@odf/shared/constants';
import { ConfigMapModel, AcmMultiClusterObservabilityModel } from '@odf/shared/models';
import { StorageClusterKind, ConfigMapKind, ACMMultiClusterObservability } from '@odf/shared/types';
import {
  SetFeatureFlag,
  k8sList,
  K8sResourceCommon,
  k8sGet
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash';
import { CEPH_STORAGE_NAMESPACE, SECOND } from './constants';

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


export const MCO_MODE_FLAG = 'MCO';

export const isMCO = process.env.MODE === 'MCO';

const ACM_OBSERVABILITY_FLAG = 'ACM_OBSERVABILITY';

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

const setOCSFlagsFalse = (setFlag: SetFeatureFlag) => {
  setFlag(OCS_FLAG, false);
  setFlag(OCS_CONVERGED_FLAG, false);
  setFlag(OCS_INDEPENDENT_FLAG, false);
  setFlag(MCG_STANDALONE, false);
};

export const setODFFlag = (setFlag: SetFeatureFlag) =>
  setFlag(ODF_MODEL_FLAG, true);

export const setMCOFlag = (setFlag: SetFeatureFlag) => setFlag(MCO_MODE_FLAG, isMCO);

export const setOCSFlags = async (setFlag: SetFeatureFlag) => {
  let ocsIntervalId = null;
  // to prevent unnecessary re-render every 15 sec
  // until storageClusters are found
  let setFlagFalse = true;
  const ocsDetector = async () => {
    try {
      const storageClusters: StorageClusterKind[] =
        await k8sList<K8sResourceCommon>({
          model: OCSStorageClusterModel,
          queryParams: { CEPH_STORAGE_NAMESPACE },
          requestInit: null,
        }) as StorageClusterKind[];
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


export const detectACMObservability = async (setFeatureFlag: SetFeatureFlag) => {
  let id = null;
  let isInitial = true;
  let mcokind: K8sModel = AcmMultiClusterObservabilityModel
  let configMapkind: K8sModel = {...ConfigMapModel}

  const handleFlag = ((isEnabled: boolean) => {
    if (isEnabled){
      setFeatureFlag(ACM_OBSERVABILITY_FLAG, isEnabled);
    } else {
      if (isInitial === true) {
        setFeatureFlag(ACM_OBSERVABILITY_FLAG, isEnabled);
        isInitial = false;
      };
    }
  });

  const handleError = ((error) => {
    if (error?.response instanceof Response) {
      const status = error?.response?.status;
      if (_.includes([403, 502], status)) {
        setFeatureFlag(ACM_OBSERVABILITY_FLAG, false);
        clearInterval(id);
      }
      if (!_.includes([401, 403, 500], status)) {
        handleFlag(false);
      }
    } else {
      clearInterval(id);
    }
  });

  const logicHandler = (() =>{
    k8sList({model: mcokind, queryParams: {}, requestInit: null,})
      .then((data: ACMMultiClusterObservability[]) => {
        const isEnabled = data?.[0].status?.conditions?.some((condition) => condition.status == "True"  && condition.type == "Ready");
        if (isEnabled) {
          k8sGet({model: configMapkind, name: ACM_WHITELISTING_METRICS_CONFIG_MAP, ns: ACM_OBSERVABILITY_NS}).then((config: ConfigMapKind) => {
            if (config?.metadata?.labels?.[ODF_METRICS_LABEL] === "true"){
              handleFlag(true);
              clearInterval(id);
            } else {
              handleFlag(false);
            }
          }).catch((error) => {
            handleError(error);
          });
        } else {
          handleFlag(false);
        };
      })
      .catch((error) => {
        handleError(error);
      });
    });
  id = setInterval(logicHandler, 5 * 1000);
} 

