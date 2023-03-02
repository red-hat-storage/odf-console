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
