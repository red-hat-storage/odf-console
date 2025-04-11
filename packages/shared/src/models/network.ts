import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const NetworkAttachmentDefinitionModel: K8sModel = {
  label: 'Network Attachment Definition',
  labelPlural: 'Network Attachment Definitions',
  apiVersion: 'v1',
  apiGroup: 'k8s.cni.cncf.io',
  plural: 'network-attachment-definitions',
  namespaced: true,
  abbr: 'NAD',
  kind: 'NetworkAttachmentDefinition',
  id: 'network-attachment-definition',
  crd: true,
  legacyPluralURL: true,
};

export const SriovNetworkNodePolicyModel: K8sModel = {
  label: 'SR-IOV Network Node Policy',
  labelPlural: 'SR-IOV Network Node Policies',
  apiVersion: 'v1',
  apiGroup: 'sriovnetwork.openshift.io',
  plural: 'sriovnetworknodepolicies',
  namespaced: true,
  abbr: 'SRNNPM', // TODO check on this
  kind: 'SriovNetworkNodePolicy',
  id: 'sriov-network-node-policy',
  crd: true,
};
