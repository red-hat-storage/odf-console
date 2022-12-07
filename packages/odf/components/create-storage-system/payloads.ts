import {
  getOCSRequestData,
  capacityAndNodesValidate,
} from '@odf/core/components/utils';
import { Payload, DeploymentType } from '@odf/core/types';
import { CEPH_STORAGE_NAMESPACE } from '@odf/shared/constants';
import { CustomResourceDefinitionModel, NodeModel } from '@odf/shared/models';
import { OCSStorageClusterModel, ODFStorageSystem } from '@odf/shared/models';
import { K8sResourceKind, Patch, StorageSystemKind } from '@odf/shared/types';
import { getAPIVersionForModel, k8sPatchByName } from '@odf/shared/utils';
import { k8sCreate, k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  ocsTaint,
  defaultRequestSize,
  NO_PROVISIONER,
  CEPH_STORAGE_LABEL,
} from '../../constants';
import { ValidationType } from '../utils/common-odf-install-el';
import { WizardNodeState, WizardState } from './reducer';

export const createStorageSystem = async (
  subSystemName: string,
  subSystemKind: string
) => {
  const payload: StorageSystemKind = {
    apiVersion: getAPIVersionForModel(ODFStorageSystem),
    kind: ODFStorageSystem.kind,
    metadata: {
      name: `${subSystemName}-storagesystem`,
      namespace: CEPH_STORAGE_NAMESPACE,
    },
    spec: {
      name: subSystemName,
      kind: subSystemKind,
      namespace: CEPH_STORAGE_NAMESPACE,
    },
  };
  return k8sCreate({ model: ODFStorageSystem, data: payload });
};

export const createStorageCluster = async (state: WizardState) => {
  const {
    storageClass,
    capacityAndNodes,
    securityAndNetwork,
    nodes,
    backingStorage,
  } = state;
  const { capacity, enableArbiter, arbiterLocation, pvCount } =
    capacityAndNodes;
  const { encryption, publicNetwork, clusterNetwork, kms } = securityAndNetwork;

  const isNoProvisioner = storageClass?.provisioner === NO_PROVISIONER;

  const storage = (
    isNoProvisioner ? defaultRequestSize.BAREMETAL : capacity
  ) as string;

  const validations = capacityAndNodesValidate(
    nodes,
    enableArbiter,
    isNoProvisioner
  );

  const isMinimal = validations.includes(ValidationType.MINIMAL);

  const isFlexibleScaling = validations.includes(
    ValidationType.ATTACHED_DEVICES_FLEXIBLE_SCALING
  );

  const isMCG = backingStorage.deployment === DeploymentType.MCG;

  const payload = getOCSRequestData(
    storageClass,
    storage,
    encryption,
    isMinimal,
    nodes,
    isFlexibleScaling,
    publicNetwork,
    clusterNetwork,
    kms.providerState.hasHandled && encryption.advanced,
    arbiterLocation,
    enableArbiter,
    pvCount,
    isMCG
  );
  return k8sCreate({ model: OCSStorageClusterModel, data: payload });
};

export const labelNodes = async (nodes: WizardNodeState[]) => {
  const patch: Patch[] = [
    {
      op: 'add',
      path: '/metadata/labels/cluster.ocs.openshift.io~1openshift-storage',
      value: '',
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    if (!node.labels?.[CEPH_STORAGE_LABEL])
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
  });
  try {
    await Promise.all(requests);
  } catch (err) {
    throw err;
  }
};

export const taintNodes = async (nodes: WizardNodeState[]) => {
  const patch: Patch[] = [
    {
      op: 'add',
      path: '/spec/taints',
      value: [ocsTaint],
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    const isAlreadyTainted = node.taints?.some((taint) =>
      _.isEqual(taint, ocsTaint)
    );
    if (!isAlreadyTainted) {
      requests.push(k8sPatchByName(NodeModel, node.name, null, patch));
    }
  });
  await Promise.all(requests);
};

export const createExternalSubSystem = async (subSystemPayloads: Payload[]) => {
  try {
    await Promise.all(
      subSystemPayloads.map(async (payload) =>
        k8sCreate({ model: payload.model as K8sKind, data: payload.payload })
      )
    );
  } catch (err) {
    throw err;
  }
};

/**
 * The crd status field should be available to proceed with CR creation.
 */
const isCRDAvailable = (crd: K8sResourceKind, plural: string) =>
  crd?.status?.acceptedNames?.plural === plural;

export const waitforCRD = async (model, maxAttempts = 30) => {
  const crdName = [model.plural, model.apiGroup].join('.');
  const POLLING_INTERVAL = 5000;
  let attempts = 0;
  /**
   * This will poll the CRD for an interval of 5s.
   * This times out after 150s.
   */
  const pollCRD = async (resolve, reject) => {
    try {
      attempts++;
      const crd = await k8sGet({
        model: CustomResourceDefinitionModel,
        name: crdName,
      });
      return isCRDAvailable(crd, model.plural)
        ? resolve()
        : setTimeout(pollCRD, POLLING_INTERVAL, resolve, reject);
    } catch (err) {
      if (err?.response?.status === 404) {
        if (attempts === maxAttempts)
          return reject(
            new Error(`CustomResourceDefintion '${crdName}' not found.`)
          );
        return setTimeout(pollCRD, POLLING_INTERVAL, resolve, reject);
      }
      return reject(err);
    }
  };

  return new Promise(pollCRD);
};
