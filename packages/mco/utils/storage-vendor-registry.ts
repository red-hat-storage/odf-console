import * as React from 'react';
import {
  CreateDRPolicyWizardSteps,
  MirrorPeerStorageVendor,
  ReplicationType,
} from '@odf/mco/constants';
import {
  DRPolicyKind,
  ManagedClusterInfoType,
  MirrorPeerKind,
} from '@odf/mco/types';
import { TFunction } from 'i18next';
import {
  storageClassCompatibilityCheck,
  submarinerCheck,
} from './pre-pair-checks';

export type StorageVendorId =
  | 'data-foundation'
  | 'ibm-storage-scale'
  | 'generic';

export type PrePairCheckResult<T = unknown> = {
  id: string;
  loaded: boolean;
  loadError: unknown;
  canProceed: boolean;
  data?: T;
};

export type PrePairCheckRenderProps<T = unknown> = {
  clusterNames: string[];
  result: PrePairCheckResult<T>;
  acknowledged: boolean;
  onAcknowledge: (acknowledged: boolean) => void;
  docHref?: string;
};

export type PrePairCheck = {
  id: string;
  useCheck: (clusterNames: string[], enabled: boolean) => PrePairCheckResult;
  requiresAcknowledgement?: (result: PrePairCheckResult) => boolean;
  render: (props: PrePairCheckRenderProps) => React.ReactNode;
};

export const getStorageVendorLabel = (
  id: StorageVendorId,
  t: TFunction<string>
): string => {
  switch (id) {
    case 'data-foundation':
      return t('Data Foundation');
    case 'ibm-storage-scale':
      return t('IBM Storage Scale');
    case 'generic':
      return t('Generic');
  }
};

type ReplicationDescriptor =
  | { mode: 'derived' }
  | { mode: 'fixed'; type: ReplicationType; interval: string }
  | { mode: 'async'; intervalEditable: true };

export type StorageVendorDescriptor = {
  id: StorageVendorId;
  mirrorPeerVendor?: MirrorPeerStorageVendor;
  replication: ReplicationDescriptor;
  allowsMultiplePoliciesPerPair: boolean;
  s3: 'internal' | 'external' | 'both';
  policyName: 'user' | 'generated';
  prePairChecks: PrePairCheck[];
  steps: CreateDRPolicyWizardSteps[];
};

export type AvailableVendor = {
  descriptor: StorageVendorDescriptor;
  isDisabled: boolean;
};

const dataFoundationDescriptor: StorageVendorDescriptor = {
  id: 'data-foundation',
  mirrorPeerVendor: MirrorPeerStorageVendor.ODF,
  replication: { mode: 'derived' },
  allowsMultiplePoliciesPerPair: true,
  s3: 'internal',
  policyName: 'user',
  prePairChecks: [storageClassCompatibilityCheck, submarinerCheck],
  steps: [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
    CreateDRPolicyWizardSteps.Configure,
    CreateDRPolicyWizardSteps.Policy,
    CreateDRPolicyWizardSteps.Review,
  ],
};

const ibmStorageScaleDescriptor: StorageVendorDescriptor = {
  id: 'ibm-storage-scale',
  mirrorPeerVendor: MirrorPeerStorageVendor.SCALE,
  replication: { mode: 'fixed', type: ReplicationType.SYNC, interval: '0m' },
  allowsMultiplePoliciesPerPair: false,
  s3: 'external',
  policyName: 'generated',
  prePairChecks: [],
  steps: [
    CreateDRPolicyWizardSteps.Clusters,
    CreateDRPolicyWizardSteps.Provider,
    CreateDRPolicyWizardSteps.Configure,
    CreateDRPolicyWizardSteps.Review,
  ],
};

const genericDescriptor: StorageVendorDescriptor = {
  id: 'generic',
  mirrorPeerVendor: undefined,
  replication: { mode: 'async', intervalEditable: true },
  allowsMultiplePoliciesPerPair: true,
  s3: 'external',
  policyName: 'user',
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

export const getDescriptorById = (
  id: StorageVendorId
): StorageVendorDescriptor => {
  switch (id) {
    case 'data-foundation':
      return dataFoundationDescriptor;
    case 'ibm-storage-scale':
      return ibmStorageScaleDescriptor;
    case 'generic':
      return genericDescriptor;
  }
};

export const findMirrorPeerForPair = (
  clusterPair: [string, string],
  mirrorPeers: MirrorPeerKind[]
): MirrorPeerKind | undefined => {
  const [c1, c2] = clusterPair.slice().sort();
  return mirrorPeers.find((mp) => {
    const peerClusters = (mp.spec?.items ?? [])
      .map((item) => item.clusterName)
      .sort();
    return (
      peerClusters.length === 2 &&
      peerClusters[0] === c1 &&
      peerClusters[1] === c2
    );
  });
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
    return [{ descriptor: genericDescriptor, isDisabled: false }];
  }

  const hasOdfOnBoth = clusters.every(hasValidOdf);
  const hasScaleOnBoth = clusters.every(hasValidScale);

  const detectedIds = new Set<StorageVendorId>();
  if (hasOdfOnBoth) detectedIds.add('data-foundation');
  if (hasScaleOnBoth) detectedIds.add('ibm-storage-scale');
  detectedIds.add('generic');

  const allVendors: StorageVendorId[] = [
    'data-foundation',
    'ibm-storage-scale',
    'generic',
  ];

  return allVendors
    .filter((id) => detectedIds.has(id))
    .map((id) => {
      const descriptor = getDescriptorById(id);
      // An owned pair offers only the owner, and only if it takes further policies.
      const isDisabled =
        !!owner && (id !== owner.id || !owner.allowsMultiplePoliciesPerPair);
      return { descriptor, isDisabled };
    });
};
