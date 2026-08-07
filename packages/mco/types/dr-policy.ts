import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
// Type-only import: keeps the types barrel free of a runtime dependency on hooks.
import type { Provider } from '../hooks/use-storage-provisioner';
import { ConnectedClient } from './odf-mco';

export type StorageClusterInfoType = {
  // Namespaced storage cluster name.
  storageClusterNamespacedName: string;
  // Ceph FSID to determine RDR/MDR.
  cephFSID: string;
  // ToDo: Use list type after ODF starts supporting
  // multiple clients per managed cluster
  clientInfo?: ConnectedClient;
  // Deployment type of ODF cluster internal/external
  deploymentType: string;
};

export type ODFConfigInfoType = {
  // ODF config info synced from managed cluster.
  storageClusterInfo: StorageClusterInfoType;
  // ODF version
  odfVersion: string;
  // ODF operator version has to be greater than or equal to MCO operator version.
  isValidODFVersion: boolean;
  // Count of storage clusters present under a OCP cluster.
  storageClusterCount: number;
};

// Using K8sResourceCommon to reuse shared components
export type ManagedClusterInfoType = K8sResourceCommon & {
  // Cluster id
  id: string;
  // Cluster is offline / online.
  isManagedClusterAvailable: boolean;
  // ODF cluster info.
  // ToDo: Use list type after ODF starts supporting
  // multiple ODF clusters per managed cluster
  odfInfo?: ODFConfigInfoType;
  providers?: Provider[];
  // Aggregates for cluster list column sorting.
  storageProvisionersCount?: number;
  storageClientsCount?: number;
};

export type S3Details = {
  clusterName: string;
  bucketName: string;
  endpoint: string;
  accessKeyId: string;
  secretKey: string;
  region: string;
  s3ProfileName: string;
};
