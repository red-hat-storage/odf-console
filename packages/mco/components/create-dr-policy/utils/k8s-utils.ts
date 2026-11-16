import {
  MirrorPeerStorageVendor,
  NOOBAA_STORAGE_CLASS_SUFFIX,
  RBD_IMAGE_FLATTEN_LABEL,
  ReplicationType,
  S3Mode,
  StorageVendorId,
} from '@odf/mco/constants';
import {
  DRClusterKind,
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
  isS3ConfigurationFailed,
  isS3ConfigurationReady,
} from '@odf/mco/utils/s3-configuration';
import {
  getDescriptorById,
  type StorageVendorDescriptor,
} from '@odf/mco/utils/storage-vendor-registry';
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

type StorageClusterRef =
  MirrorPeerKind['spec']['items'][number]['storageClusterRef'];

/** What MCO joins back to the vendor's hub ConfigMap entry for this cluster. */
const getStorageClusterRef = (
  descriptor: StorageVendorDescriptor,
  cluster: ManagedClusterInfoType
): StorageClusterRef => {
  switch (descriptor.mirrorPeerVendor) {
    case MirrorPeerStorageVendor.ODF: {
      const [name, namespace] = getODFPeers(cluster);
      return { name, namespace };
    }
    case MirrorPeerStorageVendor.SCALE: {
      // The Scale cluster name from ibm-storage-scale-info; Scale has no namespace here.
      const scaleClusterName = cluster.storageProviders?.scale?.clusterName;
      if (!scaleClusterName) {
        throw new Error(
          t(
            'Could not determine the IBM Storage Scale cluster name for cluster {{clusterName}}.',
            { clusterName: getName(cluster) }
          )
        );
      }
      return { name: scaleClusterName };
    }
  }
};

const getStorageClusterRefKey = ({
  name,
  namespace = '',
}: StorageClusterRef): string => `${name}/${namespace}`;

const fetchMirrorPeer = (
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[],
  storageClusterRefKeys: string[]
): MirrorPeerKind =>
  mirrorPeers.find((mirrorPeer) => {
    const existingPeerNames =
      mirrorPeer.spec?.items?.map((item) => item.clusterName) ?? [];
    const existingRefKeys =
      mirrorPeer.spec?.items?.map((item) =>
        getStorageClusterRefKey(item.storageClusterRef)
      ) ?? [];
    return (
      existingPeerNames.sort().join(',') === peerNames.sort().join(',') &&
      existingRefKeys.sort().join(',') ===
        storageClusterRefKeys.sort().join(',')
    );
  });

const createMirrorPeer = (
  descriptor: StorageVendorDescriptor,
  items: MirrorPeerKind['spec']['items'],
  replicationType: ReplicationType
): Promise<MirrorPeerKind> => {
  const mirrorPeerPayload: MirrorPeerKind = {
    apiVersion: getAPIVersionForModel(MirrorPeerModel),
    kind: MirrorPeerModel.kind,
    metadata: { generateName: 'mirrorpeer-' },
    spec: {
      storageVendor: descriptor.mirrorPeerVendor,
      type: replicationType,
      items,
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
  /** S3Configurations to wait for: created by this run, or reused but not Ready yet. */
  s3ConfigurationNames?: string[];
};

/** DRClusters, Ramen secret and profile belong to the S3Configuration and are GC'd with it. */
type CreatedResources = {
  s3Configurations: string[];
  secrets: string[];
  // Reused, so never rolled back, but still waited on.
  reusedNotReady: string[];
};

export const createPolicyPromises = async (
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  s3Configurations: S3ConfigurationKind[] = [],
  drClusters: DRClusterKind[] = []
): Promise<CreatePolicyResult> => {
  const peerNames = state.clusters.selectedClusters.map(getName);
  const created: CreatedResources = {
    s3Configurations: [],
    secrets: [],
    reusedNotReady: [],
  };
  const descriptor = getDescriptorById(state.provider.storageVendor);
  let peering: MirrorPeeringResult | undefined;
  let policyResult: CreateDRPolicyResult;

  try {
    // S3 follows the provider's S3 mode, not whether it creates a MirrorPeer.
    if (descriptor.s3 === S3Mode.Internal) {
      await prepareInternalS3(descriptor, state, s3Configurations, created);
    } else {
      await prepareExternalS3(state, s3Configurations, drClusters, created);
    }
    if (descriptor.mirrorPeerVendor) {
      peering = await prepareMirrorPeer(
        descriptor,
        state,
        mirrorPeers,
        peerNames
      );
    }
    policyResult = await createDRPolicy(
      state.policy.policyName,
      state.policy.replicationType,
      state.policy.syncIntervalTime,
      state.policy.enableRBDImageFlatten,
      peerNames
    );
  } catch (error) {
    if (peering?.isNew) {
      await k8sDelete({
        model: MirrorPeerModel,
        resource: peering.mirrorPeer,
      }).catch((e) =>
        // eslint-disable-next-line no-console
        console.error('Rollback: failed to delete MirrorPeer', e)
      );
    }
    await rollbackS3Resources(created);
    throw error;
  }

  const mirrorPeerName = peering ? getName(peering.mirrorPeer) : '';
  const s3ConfigurationNames = [
    ...created.s3Configurations,
    ...created.reusedNotReady,
  ];
  return {
    isNewPolicy: !policyResult.isUpdated,
    s3ConfigurationNames,
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
            !s3ConfigurationNames.length,
        }
      : {}),
  };
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

type MirrorPeeringResult = {
  mirrorPeer: MirrorPeerKind;
  isNew: boolean;
};

const prepareMirrorPeer = async (
  descriptor: StorageVendorDescriptor,
  state: DRPolicyState,
  mirrorPeers: MirrorPeerKind[],
  peerNames: string[]
): Promise<MirrorPeeringResult> => {
  const items = state.clusters.selectedClusters.map((cluster) => ({
    clusterName: getName(cluster),
    storageClusterRef: getStorageClusterRef(descriptor, cluster),
  }));

  const mirrorPeer: MirrorPeerKind = fetchMirrorPeer(
    mirrorPeers,
    peerNames,
    items.map((item) => getStorageClusterRefKey(item.storageClusterRef))
  );

  if (!mirrorPeer) {
    return {
      mirrorPeer: await createMirrorPeer(
        descriptor,
        items,
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

type InternalS3Target = { storageClassName: string; namespace: string };

/** Where internal S3 provisions its OBC; only Data Foundation has an entry today. */
const getInternalS3Target = (
  descriptor: StorageVendorDescriptor,
  cluster: ManagedClusterInfoType
): InternalS3Target | undefined => {
  switch (descriptor.id) {
    case StorageVendorId.DataFoundation: {
      const [, namespace] = parseNamespaceName(
        cluster?.odfInfo?.storageClusterInfo?.storageClusterNamespacedName
      );
      return namespace
        ? {
            storageClassName: `${namespace}${NOOBAA_STORAGE_CLASS_SUFFIX}`,
            namespace,
          }
        : undefined;
    }
    default:
      return undefined;
  }
};

/** S3Configuration to reuse, or undefined to create one; throws on a cluster conflict or a Failed match. */
const resolveExistingS3Configuration = (
  s3Configurations: S3ConfigurationKind[],
  clusterNames: string[]
): S3ConfigurationKind | undefined => {
  const exactMatch = findS3Configuration(s3Configurations, clusterNames);
  if (exactMatch && isS3ConfigurationFailed(exactMatch)) {
    // MCO can set Failed without updating message, so it may be stale.
    throw new Error(
      t(
        'The S3 configuration {{name}} for {{clusterNames}} has failed and its settings cannot be changed. Last reported message: {{message}} Delete it, then create the policy again. If DRPolicies use these clusters, delete them first; deleting the last one also removes the S3 configuration.',
        {
          name: getName(exactMatch),
          clusterNames: clusterNames.join(', '),
          message: exactMatch.status?.message || t('none'),
        }
      )
    );
  }
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

/** True when an existing S3Configuration covers the clusters; one not Ready yet is still waited on. */
const reuseExistingS3Configuration = (
  s3Configurations: S3ConfigurationKind[],
  clusterNames: string[],
  created: CreatedResources
): boolean => {
  const existing = resolveExistingS3Configuration(
    s3Configurations,
    clusterNames
  );
  if (existing && !isS3ConfigurationReady(existing)) {
    created.reusedNotReady.push(getName(existing));
  }
  return !!existing;
};

const prepareInternalS3 = async (
  descriptor: StorageVendorDescriptor,
  state: DRPolicyState,
  s3Configurations: S3ConfigurationKind[],
  created: CreatedResources
): Promise<void> => {
  const groups = getS3ClusterGroups(state);

  for (const group of groups) {
    const clusterNames = group.map(getName);

    if (reuseExistingS3Configuration(s3Configurations, clusterNames, created)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    // OBC is provisioned on the first cluster of the group and shared by the rest.
    const providerCluster = group[0];
    // Do not gate on clientInfo: ODF reports a local StorageClient even for internal mode.
    const target = getInternalS3Target(descriptor, providerCluster);
    if (!target) {
      throw new Error(
        t(
          'Could not determine where to provision the S3 bucket on cluster {{clusterName}}. S3 cannot be configured automatically.',
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
      target.storageClassName,
      target.namespace
    );
    created.s3Configurations.push(name);
  }
};

// Kubernetes DNS-1123 subdomain, required for the S3Configuration name.
const DNS1123_SUBDOMAIN =
  /^(?=.{1,253}$)[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/;

/** A legacy third-party DRCluster's s3ProfileName is immutable, so reuse it as the S3Configuration name. */
const getExternalS3ConfigurationName = (
  clusterName: string,
  drClusters: DRClusterKind[],
  s3Configurations: S3ConfigurationKind[]
): string => {
  const existingProfileName = drClusters.find(
    (drCluster) => getName(drCluster) === clusterName
  )?.spec?.s3ProfileName;
  if (!existingProfileName) {
    return getS3ConfigurationName([clusterName]);
  }
  if (!DNS1123_SUBDOMAIN.test(existingProfileName)) {
    throw new Error(
      t(
        'The DRCluster {{clusterName}} uses the S3 profile {{profileName}}, which is not a valid S3 configuration name. The profile name cannot be changed. Remove the DRPolicies that use {{clusterName}} and the DRCluster, then try again.',
        { clusterName, profileName: existingProfileName }
      )
    );
  }
  // The old console let two DRClusters share a profile name; only one can keep it.
  const nameTakenBy = s3Configurations.find(
    (config) => getName(config) === existingProfileName
  );
  if (nameTakenBy) {
    throw new Error(
      t(
        'The DRCluster {{clusterName}} uses the S3 profile {{profileName}}, which the S3 configuration for {{otherClusters}} already uses. The profile name cannot be changed. Remove the DRPolicies that use {{clusterName}} and the DRCluster, then try again.',
        {
          clusterName,
          profileName: existingProfileName,
          otherClusters: (nameTakenBy.spec?.managedClusters ?? []).join(', '),
        }
      )
    );
  }
  return existingProfileName;
};

const prepareExternalS3 = async (
  state: DRPolicyState,
  s3Configurations: S3ConfigurationKind[],
  drClusters: DRClusterKind[],
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

    if (
      reuseExistingS3Configuration(s3Configurations, [clusterName], created)
    ) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const name = getExternalS3ConfigurationName(
      clusterName,
      drClusters,
      s3Configurations
    );
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
