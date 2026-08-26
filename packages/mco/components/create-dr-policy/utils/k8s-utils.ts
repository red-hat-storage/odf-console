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
import {
  createOrUpdate,
  type CreateOrUpdateMutationDetails,
} from '@odf/shared/utils/k8s';
import {
  getAPIVersionForModel,
  k8sCreate,
  k8sDelete,
  k8sGet,
  k8sUpdate,
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

const getStorageClusterRefKey = (
  name: string,
  namespace: string = ''
): string => `${name}/${namespace}`;

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[],
  odfPeerNames: string[]
): MirrorPeerKind =>
  mirrorPeers.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer.spec?.items?.map((item) => item.clusterName) ?? [];
    const existingODFPeerNames =
      mirrorPeer.spec?.items?.map((item) =>
        getStorageClusterRefKey(
          item.storageClusterRef.name,
          item.storageClusterRef.namespace
        )
      ) ?? [];
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

type CreateDRPolicyResult = {
  policy: DRPolicyKind;
  isUpdated: boolean;
  previousPolicySpec?: DRPolicyKind['spec'];
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
  const mutationDetails: CreateOrUpdateMutationDetails = {};
  let previousPolicySpec: DRPolicyKind['spec'];

  const policy = await createOrUpdate<DRPolicyKind>({
    model: DRPolicyModel,
    name: policyName,
    mutationDetails,
    mutate: (current) => {
      if (current) {
        previousPolicySpec = current.spec
          ? (JSON.parse(JSON.stringify(current.spec)) as DRPolicyKind['spec'])
          : current.spec;
      }
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

  return {
    policy,
    isUpdated: !!mutationDetails.isUpdated,
    previousPolicySpec,
  };
};

export type CreatePolicyResult = {
  isNewPolicy: boolean;
  previousPolicySpec?: DRPolicyKind['spec'];
  mirrorPeerName?: string;
  isNewMirrorPeer?: boolean;
  skipPairingProgress?: boolean;
};

export const createPolicyPromises = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  selectedDRClusters?: DRClusterKind[]
): Promise<CreatePolicyResult> => {
  const peerNames = state.clusters.selectedClusters.map(getName);

  if (state.configure.replicationBackend === BackendType.DataFoundation) {
    let createdMirrorPeer: MirrorPeerKind | undefined;
    let peering: OdfPeeringResult;
    let policyResult: CreateDRPolicyResult;
    try {
      peering = await prepareOdfPeering(state, mirrorPeers, peerNames);
      createdMirrorPeer = peering.isNew ? peering.mirrorPeer : undefined;
      policyResult = await createDRPolicy(
        state.policy.policyName,
        state.policy.replicationType,
        state.policy.syncIntervalTime,
        state.policy.enableRBDImageFlatten,
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
      isNewPolicy: !policyResult.isUpdated,
      ...(policyResult.previousPolicySpec
        ? { previousPolicySpec: policyResult.previousPolicySpec }
        : {}),
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
    const allDRClustersExist =
      selectedDRClusters?.length === MAX_ALLOWED_CLUSTERS;
    let policyResult: CreateDRPolicyResult;

    if (allDRClustersExist) {
      policyResult = await createDRPolicy(
        state.policy.policyName,
        state.policy.replicationType,
        state.policy.syncIntervalTime,
        state.policy.enableRBDImageFlatten,
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
          state.policy.policyName,
          state.policy.replicationType,
          state.policy.syncIntervalTime,
          state.policy.enableRBDImageFlatten,
          peerNames
        );
      } catch (error) {
        await rollbackThirdPartyResources(created);
        throw error;
      }
    }

    return {
      isNewPolicy: !policyResult.isUpdated,
      ...(policyResult.previousPolicySpec
        ? { previousPolicySpec: policyResult.previousPolicySpec }
        : {}),
    };
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

export const restoreDRPolicySpec = async (
  name: string,
  previousSpec: DRPolicyKind['spec']
): Promise<DRPolicyKind> => {
  const current = (await k8sGet({
    model: DRPolicyModel,
    name,
  })) as DRPolicyKind;
  return k8sUpdate({
    model: DRPolicyModel,
    data: {
      ...current,
      spec: previousSpec,
    },
  }) as Promise<DRPolicyKind>;
};

type OdfPeeringResult = {
  mirrorPeer: MirrorPeerKind;
  isNew: boolean;
};

const prepareOdfPeering = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): Promise<OdfPeeringResult> => {
  const odfPeerNames: string[] = state.clusters.selectedClusters.map(
    (cluster) => {
      const [name, namespace] = getODFPeers(cluster);
      return getStorageClusterRefKey(name, namespace);
    }
  );

  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    odfPeerNames
  );

  if (!mirrorPeer) {
    return {
      mirrorPeer: await createMirrorPeer(
        state.clusters.selectedClusters,
        state.policy.replicationType
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
    [state.configure.cluster1S3Details.clusterName]:
      state.configure.cluster1S3Details,
    [state.configure.cluster2S3Details.clusterName]:
      state.configure.cluster2S3Details,
  };

  // Sequential: avoid ConfigMap update races across clusters.
  for (const cluster of state.clusters.selectedClusters) {
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

    // DRCluster spec is immutable - delete first if s3ProfileName changed.
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
  // Best-effort cleanup - settle all, log failures but do not throw.
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
