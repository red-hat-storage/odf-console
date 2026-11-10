import {
  BackendType,
  MirrorPeerStorageVendor,
  RBD_IMAGE_FLATTEN_LABEL,
  ReplicationType,
} from '@odf/mco/constants';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
  S3ConfigurationKind,
  S3Details,
} from '@odf/mco/types';
import { isMirrorPeerReady, parseNamespaceName } from '@odf/mco/utils';
import {
  createExternalS3Configuration,
  createExternalS3Secret,
  createInternalS3Configuration,
  deleteS3ConfigurationByName,
  deleteSecretByName,
  findS3Configuration,
  findS3ConfigurationForCluster,
  getExternalS3SecretName,
  getS3ConfigurationName,
} from '@odf/mco/utils/s3-configuration';
import { DRPolicyModel, getName, MirrorPeerModel } from '@odf/shared';
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
import { t } from 'i18next';
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
      // manageS3 is deprecated; S3Configuration owns the profile and DRClusters.
      storageVendor: MirrorPeerStorageVendor.ODF,
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
  /** S3Configurations created by this run, for progress tracking. */
  s3ConfigurationNames?: string[];
};

/** DRClusters, Ramen secret and profile belong to the S3Configuration and are GC'd with it. */
type CreatedResources = {
  s3Configurations: string[];
  secrets: string[];
};

export const createPolicyPromises = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  s3Configurations: S3ConfigurationKind[] = []
): Promise<CreatePolicyResult> => {
  const peerNames = state.clusters.selectedClusters.map(getName);
  const created: CreatedResources = { s3Configurations: [], secrets: [] };

  if (state.configure.replicationBackend === BackendType.DataFoundation) {
    let createdMirrorPeer: MirrorPeerKind | undefined;
    let peering: OdfPeeringResult;
    let policyResult: CreateDRPolicyResult;
    try {
      await prepareInternalS3(state, s3Configurations, created);
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
      await rollbackS3Resources(created);
      throw error;
    }

    const mirrorPeerName = getName(peering.mirrorPeer);
    return {
      isNewPolicy: !policyResult.isUpdated,
      s3ConfigurationNames: created.s3Configurations,
      ...(policyResult.previousPolicySpec
        ? { previousPolicySpec: policyResult.previousPolicySpec }
        : {}),
      ...(!!mirrorPeerName
        ? {
            mirrorPeerName,
            isNewMirrorPeer: peering.isNew,
            skipPairingProgress:
              !peering.isNew &&
              isMirrorPeerReady(peering.mirrorPeer) &&
              !created.s3Configurations.length,
          }
        : {}),
    };
  } else {
    let policyResult: CreateDRPolicyResult;
    try {
      await prepareExternalS3(state, s3Configurations, created);
      policyResult = await createDRPolicy(
        state.policy.policyName,
        state.policy.replicationType,
        state.policy.syncIntervalTime,
        state.policy.enableRBDImageFlatten,
        peerNames
      );
    } catch (error) {
      await rollbackS3Resources(created);
      throw error;
    }

    return {
      isNewPolicy: !policyResult.isUpdated,
      s3ConfigurationNames: created.s3Configurations,
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

/** Mirrors MCO: Sync shares one bucket, Async gets one per cluster so metadata survives a site loss. */
const getS3ClusterGroups = (
  state: DRPolicyState
): ManagedClusterInfoType[][] => {
  const { selectedClusters } = state.clusters;
  return state.policy.replicationType === ReplicationType.SYNC
    ? [selectedClusters]
    : selectedClusters.map((cluster) => [cluster]);
};

const getStorageClusterNamespace = (
  cluster: ManagedClusterInfoType
): string => {
  const [, namespace] = parseNamespaceName(
    cluster?.odfInfo?.storageClusterInfo?.storageClusterNamespacedName
  );
  return namespace;
};

/** Existing S3Configuration to reuse, or undefined to create one. Throws on a cluster conflict. */
const resolveExistingS3Configuration = (
  s3Configurations: S3ConfigurationKind[],
  clusterNames: string[]
): S3ConfigurationKind | undefined => {
  const exactMatch = findS3Configuration(s3Configurations, clusterNames);
  if (exactMatch) {
    return exactMatch;
  }

  const conflict = clusterNames
    .map((clusterName) => ({
      clusterName,
      s3Configuration: findS3ConfigurationForCluster(
        s3Configurations,
        clusterName
      ),
    }))
    .find(({ s3Configuration }) => !!s3Configuration);

  if (conflict) {
    throw new Error(
      t(
        'Cluster {{clusterName}} is already used by the S3 configuration {{name}}. A cluster can belong to only one S3 configuration. Remove the existing one before creating a new policy with a different S3 setup.',
        {
          clusterName: conflict.clusterName,
          name: getName(conflict.s3Configuration),
        }
      )
    );
  }

  return undefined;
};

const prepareInternalS3 = async (
  state: DRPolicyState,
  s3Configurations: S3ConfigurationKind[],
  created: CreatedResources
): Promise<void> => {
  const groups = getS3ClusterGroups(state);

  for (const group of groups) {
    const clusterNames = group.map(getName);

    if (resolveExistingS3Configuration(s3Configurations, clusterNames)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // OBC is provisioned on the first cluster of the group and shared by the rest.
    const providerCluster = group[0];
    const storageClusterNamespace = getStorageClusterNamespace(providerCluster);

    // Do not gate on clientInfo: ODF reports a local StorageClient even for internal mode.
    if (!storageClusterNamespace) {
      throw new Error(
        t(
          'Could not determine the Data Foundation namespace for cluster {{clusterName}}. S3 cannot be configured automatically.',
          { clusterName: getName(providerCluster) }
        )
      );
    }

    const name = getS3ConfigurationName(clusterNames);
    // eslint-disable-next-line no-await-in-loop
    await createInternalS3Configuration(
      name,
      clusterNames,
      getName(providerCluster),
      storageClusterNamespace
    );
    created.s3Configurations.push(name);
  }
};

const prepareExternalS3 = async (
  state: DRPolicyState,
  s3Configurations: S3ConfigurationKind[],
  created: CreatedResources
): Promise<void> => {
  const detailsByCluster: Record<string, S3Details> = {
    [state.configure.cluster1S3Details.clusterName]:
      state.configure.cluster1S3Details,
    [state.configure.cluster2S3Details.clusterName]:
      state.configure.cluster2S3Details,
  };

  // Per cluster even when the connection details are shared.
  for (const cluster of state.clusters.selectedClusters) {
    const clusterName = getName(cluster);
    const details = detailsByCluster[clusterName];

    if (!details) continue; // eslint-disable-line no-continue

    if (resolveExistingS3Configuration(s3Configurations, [clusterName])) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const name = getS3ConfigurationName([clusterName]);
    const secretName = getExternalS3SecretName(name);

    // eslint-disable-next-line no-await-in-loop
    await createExternalS3Secret(secretName, details);
    created.secrets.push(secretName);

    // eslint-disable-next-line no-await-in-loop
    await createExternalS3Configuration(name, [clusterName], secretName);
    created.s3Configurations.push(name);
  }
};

const rollbackS3Resources = async (
  resources: CreatedResources
): Promise<void> => {
  // Best-effort cleanup - settle all, log failures but do not throw.
  const results = await Promise.allSettled([
    ...resources.s3Configurations.map((name) =>
      deleteS3ConfigurationByName(name)
    ),
    ...resources.secrets.map((secretName) => deleteSecretByName(secretName)),
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
