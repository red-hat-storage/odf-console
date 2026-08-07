import {
  BackendType,
  MAX_ALLOWED_CLUSTERS,
  ODFMCO_OPERATOR_NAMESPACE,
  RBD_IMAGE_FLATTEN_LABEL,
  ReplicationType,
} from '@odf/mco/constants';
import {
  DRClusterKind,
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
  S3Details,
  S3StoreProfile,
} from '@odf/mco/types';
import { isMirrorPeerReady, parseNamespaceName } from '@odf/mco/utils';
import {
  createSecretNameFromS3,
  createOrUpdateRamenS3Secret,
  updateRamenHubOperatorConfig,
  deleteDRCluster,
  createDRCluster,
} from '@odf/mco/utils/tps-payload-creator';
import {
  DRPolicyModel,
  getName,
  MirrorPeerModel,
  SecretModel,
} from '@odf/shared';
import { isNotFoundError } from '@odf/shared/utils';
import { createOrUpdate } from '@odf/shared/utils/k8s';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  k8sGet,
} from '@openshift-console/dynamic-plugin-sdk';
import type { DRPolicyState } from './reducer';

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

const drPolicyExists = async (policyName: string): Promise<boolean> => {
  try {
    await k8sGet({ model: DRPolicyModel, name: policyName });
    return true;
  } catch (error) {
    return !isNotFoundError(error);
  }
};

type CreateDRPolicyResult = {
  policy: DRPolicyKind;
  isNew: boolean;
};

const createDRPolicy = async (
  policyName: string,
  replicationType: ReplicationType,
  syncIntervalTime: string,
  enableRBDImageFlatten: boolean,
  peerNames: string[]
): Promise<CreateDRPolicyResult> => {
  const schedulingInterval =
    replicationType === ReplicationType.ASYNC ? syncIntervalTime : '0m';
  const replicationClassSelector = enableRBDImageFlatten
    ? { matchLabels: RBD_IMAGE_FLATTEN_LABEL }
    : {};
  const isNew = !(await drPolicyExists(policyName));

  const policy = await createOrUpdate<DRPolicyKind>({
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

  return { policy, isNew };
};

export type CreatePolicyResult = {
  policyName: string;
  isNewPolicy: boolean;
  mirrorPeerName?: string;
  isNewMirrorPeer?: boolean;
  skipPairingProgress?: boolean;
};

export const createPolicyPromises = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  selectedDRClusters?: DRClusterKind[]
): Promise<CreatePolicyResult> => {
  const peerNames = state.selectedClusters.map(getName);

  if (state.replicationBackend === BackendType.DataFoundation) {
    let createdMirrorPeer: MirrorPeerKind | undefined;
    let peering: OdfPeeringResult;
    let policyResult: CreateDRPolicyResult;
    try {
      peering = await prepareOdfPeering(state, mirrorPeers, peerNames);
      createdMirrorPeer = peering.isNew ? peering.mirrorPeer : undefined;
      policyResult = await createDRPolicy(
        state.policyName,
        state.replicationType,
        state.syncIntervalTime,
        state.enableRBDImageFlatten,
        peerNames
      );
    } catch (error) {
      if (createdMirrorPeer) {
        await k8sDelete({
          model: MirrorPeerModel,
          resource: createdMirrorPeer,
        }).catch((e) =>
          // eslint-disable-next-line no-console
          console.error('Rollback: failed to delete MirrorPeer', e)
        );
      }
      throw error;
    }

    const mirrorPeerName = getName(peering.mirrorPeer);
    return {
      policyName: state.policyName,
      isNewPolicy: policyResult.isNew,
      ...(!!mirrorPeerName
        ? {
            mirrorPeerName,
            isNewMirrorPeer: peering.isNew,
            skipPairingProgress:
              !peering.isNew && isMirrorPeerReady(peering.mirrorPeer),
          }
        : {}),
    };
  } else {
    const bothDRClustersExist =
      selectedDRClusters?.length === MAX_ALLOWED_CLUSTERS;
    let policyResult: CreateDRPolicyResult;

    if (bothDRClustersExist) {
      policyResult = await createDRPolicy(
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
        policyResult = await createDRPolicy(
          state.policyName,
          state.replicationType,
          state.syncIntervalTime,
          state.enableRBDImageFlatten,
          peerNames
        );
      } catch (error) {
        await rollbackThirdPartyResources(created);
        throw error;
      }
    }

    return { policyName: state.policyName, isNewPolicy: policyResult.isNew };
  }
};

export const deleteMirrorPeerByName = (name: string): Promise<unknown> =>
  k8sDelete({
    model: MirrorPeerModel,
    resource: {
      metadata: { name },
    },
  });

export const deleteDRPolicyByName = (name: string): Promise<unknown> =>
  k8sDelete({
    model: DRPolicyModel,
    resource: {
      metadata: { name },
    },
  });

type OdfPeeringResult = {
  mirrorPeer: MirrorPeerKind;
  isNew: boolean;
};

const prepareOdfPeering = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): Promise<OdfPeeringResult> => {
  const odfPeerNames: string[] = state.selectedClusters.map(
    (cluster) => getODFPeers(cluster)[0]
  );
  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    odfPeerNames
  );

  if (!mirrorPeer) {
    return {
      mirrorPeer: await createMirrorPeer(
        state.selectedClusters,
        state.replicationType
      ),
      isNew: true,
    };
  }
  return { mirrorPeer, isNew: false };
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

  // Sequential: avoid ConfigMap update races across clusters.
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

    // s3ProfileName is immutable on DRCluster.
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
