import { OwnerReference, GroupVersionKind } from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export const referenceForModel = (model: K8sKind) =>
    `${model.apiGroup}~${model.apiVersion}~${model.kind}`;

export const referenceFor = (group: string) => (version: string) => (kind: string) => `${group}~${version}~${kind}`;

// Operator uses`<kind>.<apiGroup>/<apiVersion>`
export const getGVK = (label: string) => {
    const kind = label.slice(0, label.indexOf('.'));
    const apiGroup = label.slice(label.indexOf('.') + 1, label.indexOf('/'));
    const apiVersion = label.slice(label.indexOf('/') + 1, label.length);
    return { kind, apiGroup, apiVersion };
};

export const referenceForGroupVersionKind = (group: string) => (version: string) => (
    kind: string,
) => [group, version, kind].join('~');

export const groupVersionFor = (apiVersion: string) => ({
    group: apiVersion.split('/').length === 2 ? apiVersion.split('/')[0] : 'core',
    version:
      apiVersion.split('/').length === 2 ? apiVersion.split('/')[1] : apiVersion,
});

export const referenceForOwnerRef = (
    ownerRef: OwnerReference
  ): GroupVersionKind =>
    referenceForGroupVersionKind(groupVersionFor(ownerRef.apiVersion).group)(
      groupVersionFor(ownerRef.apiVersion).version
    )(ownerRef.kind);
