import {
  K8sKind,
  K8sModel,
} from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const PersistentVolumeModel: K8sKind = {
  label: 'PersistentVolume',
  // t('PersistentVolume')
  labelKey: 'PersistentVolume',
  apiVersion: 'v1',
  plural: 'persistentvolumes',
  abbr: 'PV',
  kind: 'PersistentVolume',
  id: 'persistentvolume',
  labelPlural: 'PersistentVolumes',
  // t('PersistentVolumes')
  labelPluralKey: 'PersistentVolumes',
};

export const PersistentVolumeClaimModel: K8sKind = {
  label: 'PersistentVolumeClaim',
  // t('PersistentVolumeClaim')
  labelKey: 'PersistentVolumeClaim',
  apiVersion: 'v1',
  plural: 'persistentvolumeclaims',
  abbr: 'PVC',
  namespaced: true,
  kind: 'PersistentVolumeClaim',
  id: 'persistentvolumeclaim',
  labelPlural: 'PersistentVolumeClaims',
  // t('PersistentVolumeClaims')
  labelPluralKey: 'PersistentVolumeClaims',
};

export const NodeModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Node',
  // t('Node')
  labelKey: 'Node',
  plural: 'nodes',
  abbr: 'N',
  kind: 'Node',
  id: 'node',
  labelPlural: 'Nodes',
  // t('Nodes')
  labelPluralKey: 'Nodes',
};

export const NamespaceModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Namespace',
  // t('Namespace')
  labelKey: 'Namespace',
  plural: 'namespaces',
  abbr: 'NS',
  kind: 'Namespace',
  id: 'namespace',
  labelPlural: 'Namespaces',
  // t('Namespaces')
  labelPluralKey: 'Namespaces',
};

export const ConfigMapModel: K8sKind = {
  apiVersion: 'v1',
  label: 'ConfigMap',
  // t('ConfigMap')
  labelKey: 'ConfigMap',
  plural: 'configmaps',
  abbr: 'CM',
  namespaced: true,
  kind: 'ConfigMap',
  id: 'configmap',
  labelPlural: 'ConfigMaps',
  // t('ConfigMaps')
  labelPluralKey: 'ConfigMaps',
};

export const SecretModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Secret',
  // t('Secret')
  labelKey: 'Secret',
  plural: 'secrets',
  abbr: 'S',
  namespaced: true,
  kind: 'Secret',
  id: 'secret',
  labelPlural: 'Secrets',
  // t('Secrets')
  labelPluralKey: 'Secrets',
};

export const StorageClassModel: K8sKind = {
  label: 'StorageClass',
  // t('StorageClass')
  labelKey: 'StorageClass',
  labelPlural: 'StorageClasses',
  // t('StorageClasses')
  labelPluralKey: 'StorageClasses',
  apiVersion: 'v1',
  apiGroup: 'storage.k8s.io',
  plural: 'storageclasses',
  abbr: 'SC',
  namespaced: false,
  kind: 'StorageClass',
  id: 'storageclass',
};

export const PodModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Pod',
  // t('Pod')
  labelKey: 'Pod',
  plural: 'pods',
  abbr: 'P',
  namespaced: true,
  kind: 'Pod',
  id: 'pod',
  labelPlural: 'Pods',
  // t('Pods')
  labelPluralKey: 'Pods',
};

export const CustomResourceDefinitionModel: K8sKind = {
  label: 'CustomResourceDefinition',
  // t('CustomResourceDefinition')
  labelKey: 'CustomResourceDefinition',
  apiGroup: 'apiextensions.k8s.io',
  apiVersion: 'v1',
  abbr: 'CRD',
  namespaced: false,
  plural: 'customresourcedefinitions',
  kind: 'CustomResourceDefinition',
  id: 'customresourcedefinition',
  labelPlural: 'CustomResourceDefinitions',
  // t('CustomResourceDefinitions')
  labelPluralKey: 'CustomResourceDefinitions',
};

export const DeploymentModel: K8sKind = {
  label: 'Deployment',
  // t('Deployment')
  labelKey: 'Deployment',
  apiVersion: 'v1',
  apiGroup: 'apps',
  plural: 'deployments',
  abbr: 'D',
  namespaced: true,
  propagationPolicy: 'Foreground',
  kind: 'Deployment',
  id: 'deployment',
  labelPlural: 'Deployments',
  // t('Deployments')
  labelPluralKey: 'Deployments',
};

export const EventModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Event',
  labelKey: 'Event',
  plural: 'events',
  abbr: 'E',
  namespaced: true,
  kind: 'Event',
  id: 'event',
  labelPlural: 'Events',
  labelPluralKey: 'Events',
};

export const ApplicationModel: K8sKind = {
  label: 'Application',
  labelPlural: 'Applications',
  apiVersion: 'v1beta1',
  apiGroup: 'app.k8s.io',
  plural: 'applications',
  abbr: 'APP',
  namespaced: true,
  kind: 'Application',
  crd: true,
};

export const SelfSubjectAccessReviewModel: K8sKind = {
  abbr: 'SSAR',
  kind: 'SelfSubjectAccessReview',
  label: 'SelfSubjectAccessReview',
  labelPlural: 'SelfSubjectAccessReviews',
  plural: 'selfsubjectaccessreviews',
  apiVersion: 'v1',
  apiGroup: 'authorization.k8s.io',
};

export const MachineModel: K8sModel = {
  label: 'Machine',
  labelKey: 'Machine',
  labelPlural: 'Machines',
  labelPluralKey: 'Machines',
  apiVersion: 'v1beta1',
  apiGroup: 'machine.openshift.io',
  plural: 'machines',
  abbr: 'M',
  namespaced: true,
  kind: 'Machine',
  id: 'machine',
  crd: true,
};

export const ReplicaSetModel: K8sKind = {
  label: 'ReplicaSet',
  labelKey: 'ReplicaSet',
  apiVersion: 'v1',
  apiGroup: 'apps',
  plural: 'replicasets',
  abbr: 'RS',
  namespaced: true,
  propagationPolicy: 'Foreground',
  kind: 'ReplicaSet',
  id: 'replicaset',
  labelPlural: 'ReplicaSets',
  labelPluralKey: 'ReplicaSets',
};

export const StatefulSetModel: K8sKind = {
  label: 'StatefulSet',
  labelKey: 'StatefulSet',
  apiGroup: 'apps',
  apiVersion: 'v1',
  plural: 'statefulsets',
  abbr: 'SS',
  namespaced: true,
  propagationPolicy: 'Foreground',
  kind: 'StatefulSet',
  id: 'statefulset',
  labelPlural: 'StatefulSets',
  labelPluralKey: 'StatefulSets',
};

export const DaemonSetModel: K8sKind = {
  label: 'DaemonSet',
  labelKey: 'DaemonSet',
  apiGroup: 'apps',
  plural: 'daemonsets',
  apiVersion: 'v1',
  abbr: 'DS',
  namespaced: true,
  propagationPolicy: 'Foreground',
  kind: 'DaemonSet',
  id: 'daemonset',
  labelPlural: 'DaemonSets',
  labelPluralKey: 'DaemonSets',
};

export const StorageClusterModel: K8sKind = {
  label: 'Storage Cluster',
  labelPlural: 'Storage Clusters',
  apiVersion: 'v1',
  apiGroup: 'ocs.openshift.io',
  plural: 'storageclusters',
  abbr: 'OCS',
  namespaced: true,
  kind: 'StorageCluster',
  id: 'ocscluster',
  crd: true,
};
