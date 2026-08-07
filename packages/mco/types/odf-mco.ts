import { MirrorPeerPhase, MirrorPeerPhaseMessage } from '@odf/mco/constants';
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
    manageS3: boolean;
    type: string;
  };
  status?: {
    phase?: MirrorPeerPhase;
    message?: MirrorPeerPhaseMessage | string;
    conditions?: K8sResourceCondition[];
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
