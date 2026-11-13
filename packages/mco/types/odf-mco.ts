import {
  MirrorPeerPhase,
  MirrorPeerPhaseMessage,
  S3ConfigurationPhase,
  S3Type,
} from '@odf/mco/constants';
import {
  K8sResourceCommon,
  K8sResourceCondition,
} from '@openshift-console/dynamic-plugin-sdk';

// Keep in sync with odf-multicluster-orchestrator/api/v1alpha1/mirrorpeer_types.go
export type MirrorPeerKind = K8sResourceCommon & {
  spec?: {
    items: {
      clusterName: string;
      storageClusterRef: {
        name: string;
        namespace: string;
      };
    }[];
    // Defaults to "odf" server-side.
    storageVendor?: string;
    type: string;
  };
  status?: {
    phase?: MirrorPeerPhase;
    message?: MirrorPeerPhaseMessage | string;
    conditions?: K8sResourceCondition[];
  };
};

// Keep in sync with odf-multicluster-orchestrator/api/v1alpha1/s3configuration_types.go
// Cluster scoped; spec is immutable (CEL), so create or delete, never patch.
export type S3ConfigurationKind = K8sResourceCommon & {
  spec: {
    // Exactly one of internalS3 / externalS3 must be set.
    internalS3?: {
      // Must be one of `managedClusters`; the OBC is created here.
      providerCluster: string;
      storageClassName: string;
      namespace: string;
      // Defaults server-side to `odrbucket-<metadata.name>`.
      obcName?: string;
    };
    externalS3?: {
      // Secret must pre-exist on the hub with all five S3 keys.
      secretRef: { name: string; namespace: string };
    };
    // A cluster may belong to only one S3Configuration.
    managedClusters: string[];
  };
  status?: {
    type?: S3Type;
    phase?: S3ConfigurationPhase;
    // Several failure paths set phase without setting message.
    message?: string;
    configuredClusters?: string[];
  };
};

export type ConnectedClient = {
  name: string;
  clusterId: string;
};

export type InfoStorageCluster = {
  namespacedName: {
    name: string;
    namespace: string;
  };
  storageProviderEndpoint: string;
  cephClusterFSID: string;
};

export type ODFInfoYamlObject = {
  version: string;
  deploymentType: string;
  clients: ConnectedClient[];
  storageCluster: InfoStorageCluster;
};
