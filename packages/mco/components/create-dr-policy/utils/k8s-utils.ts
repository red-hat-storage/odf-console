import { RBD_IMAGE_FLATTEN_LABEL, REPLICATION_TYPE } from '@odf/mco/constants';
import { DRPolicyModel, MirrorPeerModel } from '@odf/mco/models';
import { DRPolicyKind, MirrorPeerKind } from '@odf/mco/types';
import { parseNamespaceName } from '@odf/mco/utils';
import { getName } from '@odf/shared';
import {
  getAPIVersionForModel,
  k8sCreate,
  K8sResourceKind,
} from '@openshift-console/dynamic-plugin-sdk';
import { DRPolicyState, ManagedClusterInfoType } from './reducer';

const getODFPeers = (cluster: ManagedClusterInfoType) => {
  const storageClusterInfo = cluster?.odfInfo?.storageClusterInfo;
  if (!!storageClusterInfo?.clientInfo) {
    return [storageClusterInfo.clientInfo?.name, ''];
  }
  return parseNamespaceName(storageClusterInfo?.storageClusterNamespacedName);
};

const getPeerClustersRef = (clusters: ManagedClusterInfoType[]) =>
  clusters.map((cluster) => {
    const [storageClusterName, storageClusterNamesapce] = getODFPeers(cluster);
    return {
      clusterName: getName(cluster),
      storageClusterRef: {
        name: storageClusterName,
        namespace: storageClusterNamesapce,
      },
    };
  });

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[],
  odfPeerNames: string[]
): MirrorPeerKind =>
  mirrorPeers.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer.spec?.items?.map((item) => item.clusterName) ?? [];
    const existingODFPeerNames =
      mirrorPeer.spec?.items?.map(
        (item) =>
          `${item.storageClusterRef.name},${
            item.storageClusterRef?.namespace || ''
          }`
      ) ?? [];
    return (
      existingPeerNames.sort().join(',') === peerNames.sort().join(',') &&
      existingODFPeerNames.sort().join(',') === odfPeerNames.sort().join(',')
    );
  });

const createMirrorPeer = (
  selectedClusters: ManagedClusterInfoType[],
  replicationType: REPLICATION_TYPE
): Promise<MirrorPeerKind> => {
  const mirrorPeerPayload: MirrorPeerKind = {
    apiVersion: getAPIVersionForModel(MirrorPeerModel),
    kind: MirrorPeerModel.kind,
    metadata: { generateName: 'mirrorpeer-' },
    spec: {
      manageS3: true,
      type: replicationType,
      items: getPeerClustersRef(selectedClusters),
    },
  };
  return k8sCreate({
    model: MirrorPeerModel,
    data: mirrorPeerPayload,
  });
};

const createDRPolicy = (
  policyName: string,
  replicationType: REPLICATION_TYPE,
  syncIntervalTime: string,
  enableRBDImageFlatten: boolean,
  peerNames: string[]
): Promise<DRPolicyKind> => {
  const drPolicyPayload: DRPolicyKind = {
    apiVersion: getAPIVersionForModel(DRPolicyModel),
    kind: DRPolicyModel.kind,
    metadata: { name: policyName },
    spec: {
      replicationClassSelector: enableRBDImageFlatten
        ? { matchLabels: RBD_IMAGE_FLATTEN_LABEL }
        : {},
      schedulingInterval:
        replicationType === REPLICATION_TYPE.ASYNC ? syncIntervalTime : '0m',
      drClusters: peerNames,
    },
  };
  return k8sCreate({
    model: DRPolicyModel,
    data: drPolicyPayload,
  });
};

export const createPolicyPromises = (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[]
): Promise<K8sResourceKind>[] => {
  const promises: Promise<K8sResourceKind>[] = [];
  const peerNames = state.selectedClusters.map(getName);
  promises.push(
    createDRPolicy(
      state.policyName,
      state.replicationType,
      state.syncIntervalTime,
      state.enableRBDImageFlatten,
      peerNames
    )
  );
  const odfPeerNames: string[] = state.selectedClusters.map((cluster) =>
    getODFPeers(cluster).join(',')
  );
  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    odfPeerNames
  );

  if (!mirrorPeer) {
    promises.push(
      createMirrorPeer(state.selectedClusters, state.replicationType)
    );
  }

  return promises;
};
