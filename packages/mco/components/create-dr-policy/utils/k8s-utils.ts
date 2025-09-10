import {
  BackendType,
  ODFMCO_OPERATOR_NAMESPACE,
  RBD_IMAGE_FLATTEN_LABEL,
  ReplicationType,
} from '@odf/mco/constants';
import { DRPolicyKind, MirrorPeerKind, S3StoreProfile } from '@odf/mco/types';
import { parseNamespaceName } from '@odf/mco/utils';
import {
  createSecretNameFromS3,
  createOrUpdateDRCluster,
  createOrUpdateRamenS3Secret,
  updateRamenHubOperatorConfig,
} from '@odf/mco/utils/tps-payload-creator';
import { DRPolicyModel, MirrorPeerModel } from '@odf/shared';
import { getName } from '@odf/shared';
import {
  getAPIVersionForModel,
  k8sCreate,
  K8sResourceKind,
} from '@openshift-console/dynamic-plugin-sdk';
import { S3Details } from '../add-s3-bucket-details/s3-bucket-details-form';
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
    const [storageClusterName, storageClusterNamespace] = getODFPeers(cluster);
    return {
      clusterName: getName(cluster),
      storageClusterRef: {
        name: storageClusterName,
        namespace: storageClusterNamespace,
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
      mirrorPeer.spec?.items?.map((item) => `${item.storageClusterRef.name}`) ??
      [];
    return (
      existingPeerNames.sort().join(',') === peerNames.sort().join(',') &&
      existingODFPeerNames.sort().join(',') === odfPeerNames.sort().join(',')
    );
  });

const createMirrorPeer = (
  selectedClusters: ManagedClusterInfoType[],
  replicationType: ReplicationType
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
  replicationType: ReplicationType,
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
        replicationType === ReplicationType.ASYNC ? syncIntervalTime : '0m',
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
  const peerNames = state.selectedClusters.map(getName);

  if (state.replicationBackend === BackendType.DataFoundation) {
    const promises: Promise<K8sResourceKind>[] = [];

    promises.push(
      createDRPolicy(
        state.policyName,
        state.replicationType,
        state.syncIntervalTime,
        state.enableRBDImageFlatten,
        peerNames
      )
    );

    const mirrorPeerPromise = prepareOdfPeering(state, mirrorPeers, peerNames);
    if (mirrorPeerPromise) {
      promises.push(mirrorPeerPromise as Promise<K8sResourceKind>);
    }

    return promises;
  }

  const peering = prepareThirdPartyPeering(state);

  const gatedDRPolicy = peering.then(() =>
    createDRPolicy(
      state.policyName,
      state.replicationType,
      state.syncIntervalTime,
      state.enableRBDImageFlatten,
      peerNames
    )
  ) as Promise<K8sResourceKind>;

  return [gatedDRPolicy];
};

const prepareOdfPeering = (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): Promise<MirrorPeerKind> => {
  const odfPeerNames: string[] = state.selectedClusters.map((cluster) =>
    getODFPeers(cluster).join(',')
  );
  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    odfPeerNames
  );

  if (!mirrorPeer) {
    return createMirrorPeer(state.selectedClusters, state.replicationType);
  }
};

export const prepareThirdPartyPeering = async (
  state: DRPolicyState
): Promise<void> => {
  const detailsByCluster: Record<string, S3Details> = {
    [state.cluster1S3Details.clusterName]: state.cluster1S3Details,
    [state.cluster2S3Details.clusterName]: state.cluster2S3Details,
  };

  const validClusters = state.selectedClusters.filter(
    (c) => !!detailsByCluster[getName(c)]
  );

  /* eslint-disable no-await-in-loop */
  for (const cluster of validClusters) {
    const name = getName(cluster);
    const det = detailsByCluster[name]!;

    const secretName = createSecretNameFromS3(det, 's3');
    const s3Profile: S3StoreProfile = {
      s3Bucket: det.bucketName,
      s3Region: det.region,
      s3CompatibleEndpoint: det.endpoint,
      s3SecretRef: { name: secretName, namespace: ODFMCO_OPERATOR_NAMESPACE },
      s3ProfileName: det.s3ProfileName,
    };

    await createOrUpdateDRCluster({ name, s3ProfileName: det.s3ProfileName });
    await createOrUpdateRamenS3Secret({
      name: secretName,
      accessKeyId: det.accessKeyId,
      secretAccessKey: det.secretKey,
    });
    await updateRamenHubOperatorConfig({
      namespace: ODFMCO_OPERATOR_NAMESPACE,
      profile: s3Profile,
    });
  }
  /* eslint-enable no-await-in-loop */
};
