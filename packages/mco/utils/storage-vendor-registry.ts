import {
  CreateDRPolicyWizardSteps,
  MirrorPeerStorageVendor,
  PolicyNameSource,
  PrePairCheckId,
  ReplicationMode,
  ReplicationType,
  S3Mode,
  StorageVendorId,
} from '@odf/mco/constants';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { TFunction } from 'i18next';
import { findMirrorPeerForPair } from './mirrorpeer';

export type PrePairCheckResult<T = unknown> = {
  id: PrePairCheckId;
  loaded: boolean;
  loadError: unknown;
  canProceed: boolean;
  data?: T;
};

export const getStorageVendorLabel = (
  id: StorageVendorId,
  t: TFunction<string>
): string => {
  switch (id) {
    case StorageVendorId.DataFoundation:
      return t('Data Foundation');
    case StorageVendorId.IbmStorageScale:
      return t('IBM Storage Scale');
    case StorageVendorId.Generic:
      return t('Other storage providers');
  }
};

type ReplicationDescriptor =
  | { mode: ReplicationMode.Derived }
  | { mode: ReplicationMode.Fixed; type: ReplicationType; interval: string }
  | { mode: ReplicationMode.Async; intervalEditable: true };

export type StorageVendorDescriptor = {
  id: StorageVendorId;
  mirrorPeerVendor?: MirrorPeerStorageVendor;
  replication: ReplicationDescriptor;
  allowsMultiplePoliciesPerPair: boolean;
  s3: S3Mode;
  policyName: PolicyNameSource;
  prePairChecks: PrePairCheckId[];
  steps: CreateDRPolicyWizardSteps[];
};

export type AvailableVendor = {
  descriptor: StorageVendorDescriptor;
  isDisabled: boolean;
};

const dataFoundationDescriptor: StorageVendorDescriptor = {
  id: StorageVendorId.DataFoundation,
  mirrorPeerVendor: MirrorPeerStorageVendor.ODF,
  replication: { mode: ReplicationMode.Derived },
  allowsMultiplePoliciesPerPair: true,
  s3: S3Mode.Internal,
  policyName: PolicyNameSource.User,
  prePairChecks: [
    PrePairCheckId.OdfPrerequisites,
    PrePairCheckId.StorageClassCompatibility,
    PrePairCheckId.Submariner,
  ],
  steps: [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
    CreateDRPolicyWizardSteps.Configure,
    CreateDRPolicyWizardSteps.Policy,
    CreateDRPolicyWizardSteps.Review,
  ],
};

const ibmStorageScaleDescriptor: StorageVendorDescriptor = {
  id: StorageVendorId.IbmStorageScale,
  mirrorPeerVendor: MirrorPeerStorageVendor.SCALE,
  replication: {
    mode: ReplicationMode.Fixed,
    type: ReplicationType.SYNC,
    interval: '0m',
  },
  allowsMultiplePoliciesPerPair: false,
  // Internal S3 may follow once product confirms it for Scale.
  s3: S3Mode.External,
  policyName: PolicyNameSource.Generated,
  prePairChecks: [],
  // Policy is shown read-only: Scale sets the name and replication type.
  steps: [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
    CreateDRPolicyWizardSteps.Configure,
    CreateDRPolicyWizardSteps.Policy,
    CreateDRPolicyWizardSteps.Review,
  ],
};

const genericDescriptor: StorageVendorDescriptor = {
  id: StorageVendorId.Generic,
  mirrorPeerVendor: undefined,
  replication: { mode: ReplicationMode.Async, intervalEditable: true },
  allowsMultiplePoliciesPerPair: true,
  s3: S3Mode.External,
  policyName: PolicyNameSource.User,
  prePairChecks: [],
  steps: [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
    CreateDRPolicyWizardSteps.Configure,
    CreateDRPolicyWizardSteps.Policy,
    CreateDRPolicyWizardSteps.Review,
  ],
};

const hasValidOdf = (cluster: ManagedClusterInfoType): boolean =>
  !!cluster.storageProviders?.odf && !!cluster.odfInfo?.isValidODFVersion;

const hasValidScale = (cluster: ManagedClusterInfoType): boolean =>
  !!cluster.storageProviders?.scale;

const hasOtherStorage = (cluster: ManagedClusterInfoType): boolean =>
  !!cluster.providers?.length;

const ALL_VENDORS: StorageVendorId[] = [
  StorageVendorId.DataFoundation,
  StorageVendorId.IbmStorageScale,
  StorageVendorId.Generic,
];

const vendorChecks: Record<
  StorageVendorId,
  (cluster: ManagedClusterInfoType) => boolean
> = {
  [StorageVendorId.DataFoundation]: hasValidOdf,
  [StorageVendorId.IbmStorageScale]: hasValidScale,
  [StorageVendorId.Generic]: hasOtherStorage,
};

/** Providers a cluster can use for DR. */
export const getClusterProviderIds = (
  cluster: ManagedClusterInfoType
): StorageVendorId[] => ALL_VENDORS.filter((id) => vendorChecks[id](cluster));

/** Providers every given cluster can use. */
export const getSharedProviderIds = (
  clusters: ManagedClusterInfoType[]
): StorageVendorId[] =>
  clusters.reduce(
    (shared, cluster) => {
      const ids = getClusterProviderIds(cluster);
      return shared.filter((id) => ids.includes(id));
    },
    [...ALL_VENDORS]
  );

export const getDescriptorById = (
  id: StorageVendorId
): StorageVendorDescriptor => {
  switch (id) {
    case StorageVendorId.DataFoundation:
      return dataFoundationDescriptor;
    case StorageVendorId.IbmStorageScale:
      return ibmStorageScaleDescriptor;
    case StorageVendorId.Generic:
      return genericDescriptor;
  }
};

/** Policy name for a provider that does not let the user choose one. */
export const generatePolicyName = (
  providerId: StorageVendorId,
  clusterNames: string[]
): string => {
  const sanitize = (s: string) => s.toLowerCase().replace(/\s/g, '-');
  const base = `${sanitize(providerId)}-${clusterNames
    .map(sanitize)
    .sort()
    .join('-')}`;
  return base.substring(0, 253).replace(/-+$/, '');
};

/** DF is Sync only when both clusters share one Ceph cluster. */
export const getReplicationTypeForPair = (
  descriptor: StorageVendorDescriptor,
  clusters: ManagedClusterInfoType[]
): ReplicationType => {
  switch (descriptor.replication.mode) {
    case ReplicationMode.Derived: {
      const [fsid1, fsid2] = clusters.map(
        (cluster) => cluster.odfInfo?.storageClusterInfo?.cephFSID
      );
      return !!fsid1 && fsid1 === fsid2
        ? ReplicationType.SYNC
        : ReplicationType.ASYNC;
    }
    case ReplicationMode.Fixed:
      return descriptor.replication.type;
    case ReplicationMode.Async:
      return ReplicationType.ASYNC;
  }
};

export const resolvePairOwner = (
  clusterPair: [string, string],
  mirrorPeers: MirrorPeerKind[],
  drPolicies: DRPolicyKind[]
): StorageVendorDescriptor | undefined => {
  const mirrorPeer = findMirrorPeerForPair(clusterPair, mirrorPeers);
  if (mirrorPeer?.spec?.storageVendor) {
    if (mirrorPeer.spec.storageVendor === MirrorPeerStorageVendor.ODF) {
      return dataFoundationDescriptor;
    }
    if (mirrorPeer.spec.storageVendor === MirrorPeerStorageVendor.SCALE) {
      return ibmStorageScaleDescriptor;
    }
  }

  const [c1, c2] = clusterPair.slice().sort();
  const hasGenericPolicy = drPolicies.some((policy) => {
    const drClusters = (policy.spec?.drClusters ?? []).slice().sort();
    return (
      drClusters.length === 2 && drClusters[0] === c1 && drClusters[1] === c2
    );
  });

  if (hasGenericPolicy && !mirrorPeer) {
    return genericDescriptor;
  }

  return undefined;
};

export const getAvailableVendors = (
  clusters: ManagedClusterInfoType[],
  owner?: StorageVendorDescriptor
): AvailableVendor[] => {
  if (clusters.length !== 2) {
    return [];
  }

  return getSharedProviderIds(clusters).map((id) => {
    const descriptor = getDescriptorById(id);
    // An owned pair offers only the owner, and only if it takes further policies.
    const isDisabled =
      !!owner && (id !== owner.id || !owner.allowsMultiplePoliciesPerPair);
    return { descriptor, isDisabled };
  });
};
