import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

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
  isDROptimized: boolean;
};

export type ODFInfoYamlObject = {
  version: string;
  deploymentType: string;
  clients: ConnectedClient[];
  storageCluster: InfoStorageCluster;
  storageSystemName: string;
};
