import {
  BackendType,
  ODFMCO_OPERATOR_NAMESPACE,
  RBD_IMAGE_FLATTEN_LABEL,
  ReplicationType,
} from '@odf/mco/constants';
import {
  DRClusterKind,
  DRPolicyKind,
  MirrorPeerKind,
  S3StoreProfile,
} from '@odf/mco/types';
import { parseNamespaceName } from '@odf/mco/utils';
import {
  createSecretNameFromS3,
  createOrUpdateRamenS3Secret,
  updateRamenHubOperatorConfig,
  deleteDRCluster,
  createDRCluster,
} from '@odf/mco/utils/tps-payload-creator';
import { DRPolicyModel, MirrorPeerModel, SecretModel } from '@odf/shared';
import { getName } from '@odf/shared';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
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
  //  areDRClustersCreated: boolean = false
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
  const schedulingInterval =
    replicationType === ReplicationType.ASYNC ? syncIntervalTime : '0m';
  const replicationClassSelector = enableRBDImageFlatten
    ? { matchLabels: RBD_IMAGE_FLATTEN_LABEL }
    : {};

  return createOrUpdate<DRPolicyKind>({
    model: DRPolicyModel,
    name: policyName,
    mutate: (current) => {
      const base: DRPolicyKind = current ?? {
        apiVersion: getAPIVersionForModel(DRPolicyModel),
        kind: DRPolicyModel.kind,
        metadata: { name: policyName },
        spec: {
          replicationClassSelector,
          schedulingInterval,
          drClusters: peerNames,
        },
      };

      return {
        ...base,
        spec: {
          ...base.spec,
          replicationClassSelector,
          schedulingInterval,
          drClusters: peerNames,
        },
      };
    },
  });
};

export const createPolicyPromises = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  selectedDRClusters?: DRClusterKind[]
): Promise<void> => {
  const peerNames = state.selectedClusters.map(getName);

  if (state.replicationBackend === BackendType.DataFoundation) {
    await prepareOdfPeering(state, mirrorPeers, peerNames);
    await createDRPolicy(
      state.policyName,
      state.replicationType,
      state.syncIntervalTime,
      state.enableRBDImageFlatten,
      peerNames
    );
  } else {
    const created: CreatedResources = {
      secrets: [],
      profiles: [],
      drClusters: [],
    };
    try {
      await prepareThirdPartyPeering(state, selectedDRClusters, created);
      await createDRPolicy(
        state.policyName,
        state.replicationType,
        state.syncIntervalTime,
        state.enableRBDImageFlatten,
        peerNames
      );
    } catch (error) {
      // Best-effort rollback of any resources created so far.
      await rollbackThirdPartyResources(created);
      throw error;
    }
  }
};

const prepareOdfPeering = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): Promise<void> => {
  const odfPeerNames: string[] = state.selectedClusters.map(
    (cluster) => getODFPeers(cluster)[0]
  );
  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    odfPeerNames
  );

  if (!mirrorPeer) {
    await createMirrorPeer(state.selectedClusters, state.replicationType);
  }
};

type CreatedResources = {
  secrets: string[];
  profiles: S3StoreProfile[];
  drClusters: string[];
};

const prepareThirdPartyPeering = async (
  state: DRPolicyState,
  selectedDRClusters: DRClusterKind[] = [],
  created: CreatedResources
): Promise<void> => {
  const detailsByCluster: Record<string, S3Details> = {
    [state.cluster1S3Details.clusterName]: state.cluster1S3Details,
    [state.cluster2S3Details.clusterName]: state.cluster2S3Details,
  };

  // Process each cluster sequentially to avoid ConfigMap race conditions.
  for (const cluster of state.selectedClusters) {
    const name = getName(cluster);
    const det = detailsByCluster[name];

    if (!det) continue; // eslint-disable-line no-continue

    const secretName = createSecretNameFromS3(det, 's3');
    const s3Profile: S3StoreProfile = {
      s3Bucket: det.bucketName,
      s3Region: det.region,
      s3CompatibleEndpoint: det.endpoint,
      s3SecretRef: { name: secretName },
      s3ProfileName: det.s3ProfileName,
    };

    const existingDRCluster = selectedDRClusters.find(
      (drCluster) => getName(drCluster) === name
    );

    // DRCluster spec is immutable — delete first if s3ProfileName changed.
    const needsRecreate =
      existingDRCluster &&
      existingDRCluster.spec.s3ProfileName !== det.s3ProfileName;

    if (needsRecreate) {
      // eslint-disable-next-line no-await-in-loop
      await deleteDRCluster(name);
    }

    // eslint-disable-next-line no-await-in-loop
    await createOrUpdateRamenS3Secret({
      name: secretName,
      accessKeyId: det.accessKeyId,
      secretAccessKey: det.secretKey,
    });
    created.secrets.push(secretName);

    // eslint-disable-next-line no-await-in-loop
    await updateRamenHubOperatorConfig({
      namespace: ODFMCO_OPERATOR_NAMESPACE,
      profile: s3Profile,
    });
    created.profiles.push(s3Profile);

    if (!existingDRCluster || needsRecreate) {
      // eslint-disable-next-line no-await-in-loop
      await createDRCluster({
        name,
        s3ProfileName: det.s3ProfileName,
      });
      created.drClusters.push(name);
    }
  }
};

const rollbackThirdPartyResources = async (
  resources: CreatedResources
): Promise<void> => {
  // Best-effort cleanup — settle all, log failures but do not throw.
  const results = await Promise.allSettled([
    ...resources.drClusters.map((name) => deleteDRCluster(name)),
    ...resources.profiles.map((profile) =>
      updateRamenHubOperatorConfig({
        namespace: ODFMCO_OPERATOR_NAMESPACE,
        profile,
        remove: true,
      })
    ),
    ...resources.secrets.map((secretName) =>
      k8sDelete({
        model: SecretModel,
        resource: {
          metadata: {
            name: secretName,
            namespace: ODFMCO_OPERATOR_NAMESPACE,
          },
        },
      })
    ),
  ]);

  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => {
      // eslint-disable-next-line no-console
      console.error(
        'Rollback: failed to clean up resource',
        (r as PromiseRejectedResult).reason
      );
    });
};
