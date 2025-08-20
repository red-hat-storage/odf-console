import { K8sModel } from '@openshift-console/dynamic-plugin-sdk';

export const ClusterModel: K8sModel = {
  apiVersion: 'v1beta1',
  apiGroup: 'scale.spectrum.ibm.com',
  kind: 'Cluster',
  plural: 'clusters',
  label: 'Cluster',
  labelPlural: 'Clusters',
  crd: true,
  abbr: 'Cl',
  namespaced: false,
};

export const EncryptionConfigModel: K8sModel = {
  apiVersion: 'v1beta1',
  apiGroup: 'scale.spectrum.ibm.com',
  kind: 'EncryptionConfig',
  plural: 'encryptionconfigs',
  label: 'EncryptionConfig',
  labelPlural: 'EncryptionConfigs',
  crd: true,
  abbr: 'EC',
  namespaced: true,
};

export const RemoteClusterModel: K8sModel = {
  apiVersion: 'v1beta1',
  apiGroup: 'scale.spectrum.ibm.com',
  kind: 'RemoteCluster',
  plural: 'remoteclusters',
  label: 'RemoteCluster',
  labelPlural: 'RemoteClusters',
  crd: true,
  abbr: 'RC',
  namespaced: true,
};

export const FileSystemModel: K8sModel = {
  apiVersion: 'v1beta1',
  apiGroup: 'scale.spectrum.ibm.com',
  kind: 'Filesystem',
  plural: 'filesystems',
  label: 'Filesystem',
  labelPlural: 'Filesystems',
  crd: true,
  abbr: 'Fs',
  namespaced: true,
};
