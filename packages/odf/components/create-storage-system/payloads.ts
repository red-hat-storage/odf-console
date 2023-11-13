import {
  getOCSRequestData,
  capacityAndNodesValidate,
} from '@odf/core/components/utils';
import { DeploymentType, BackingStorageType } from '@odf/core/types';
import { Payload } from '@odf/odf-plugin-sdk/extensions';
import {
  OCSStorageClusterModel,
  ODFStorageSystem,
  NodeModel,
} from '@odf/shared/models';
import { Patch, StorageSystemKind } from '@odf/shared/types';
import { getAPIVersionForModel, k8sPatchByName } from '@odf/shared/utils';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import {
  ocsTaint,
  defaultRequestSize,
  NO_PROVISIONER,
  cephStorageLabel,
} from '../../constants';
import { ValidationType } from '../utils/common-odf-install-el';
import { WizardNodeState, WizardState } from './reducer';

export const createStorageSystem = async (
  subSystemName: string,
  subSystemKind: string,
  odfNamespace: string
) => {
  const payload: StorageSystemKind = {
    apiVersion: getAPIVersionForModel(ODFStorageSystem),
    kind: ODFStorageSystem.kind,
    metadata: {
      name: `${subSystemName}-storagesystem`,
      namespace: odfNamespace,
    },
    spec: {
      name: subSystemName,
      kind: subSystemKind,
      namespace: odfNamespace,
    },
  };
  return k8sCreate({ model: ODFStorageSystem, data: payload });
};

export const createStorageCluster = async (
  state: WizardState,
  odfNamespace: string
) => {
  const {
    storageClass,
    capacityAndNodes,
    securityAndNetwork,
    nodes,
    backingStorage,
    dataProtection,
  } = state;
  const {
    capacity,
    enableArbiter,
    arbiterLocation,
    pvCount,
    enableSingleReplicaPool,
  } = capacityAndNodes;
  const { encryption, publicNetwork, clusterNetwork, kms } = securityAndNetwork;
  const { type, enableNFS, isRBDStorageClassDefault, deployment } =
    backingStorage;
  const { enableRDRPreparation } = dataProtection;

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

  const isMCG = deployment === DeploymentType.MCG;
  const isNFSEnabled =
    enableNFS &&
    deployment === DeploymentType.FULL &&
    type !== BackingStorageType.EXTERNAL;

  const shouldSetCephRBDAsDefault =
    isRBDStorageClassDefault && deployment === DeploymentType.FULL;

  const payload = getOCSRequestData({
    storageClass,
    storage,
    encryption,
    isMinimal,
    nodes,
    flexibleScaling: isFlexibleScaling,
    publicNetwork,
    clusterNetwork,
    kmsEnable: kms.providerState.hasHandled && encryption.advanced,
    selectedArbiterZone: arbiterLocation,
    stretchClusterChecked: enableArbiter,
    availablePvsCount: pvCount,
    isMCG,
    isNFSEnabled,
    shouldSetCephRBDAsDefault,
    isSingleReplicaPoolEnabled: enableSingleReplicaPool,
    enableRDRPreparation,
    odfNamespace,
  });
  return k8sCreate({ model: OCSStorageClusterModel, data: payload });
};

export const labelNodes = async (
  nodes: WizardNodeState[],
  odfNamespace: string
) => {
  const labelPath = `/metadata/labels/cluster.ocs.openshift.io~1${odfNamespace}`;
  const storageLabel = cephStorageLabel(odfNamespace);
  const patch: Patch[] = [
    {
      op: 'add',
      path: labelPath,
      value: '',
    },
  ];
  const requests: Promise<K8sKind>[] = [];
  nodes.forEach((node) => {
    if (!node.labels?.[storageLabel])
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
