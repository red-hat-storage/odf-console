import { K8sResourceKind, Patch } from '@odf/shared/types';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import {
  K8sGroupVersionKind,
  K8sResourceKindReference,
  OwnerReference,
  GroupVersionKind,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import * as _ from 'lodash-es';
import { GetAPIVersionForModel } from '../types';

const defaultClassAnnotation = 'storageclass.kubernetes.io/is-default-class';
const betaDefaultStorageClassAnnotation =
  'storageclass.beta.kubernetes.io/is-default-class';
export const LAST_LANGUAGE_LOCAL_STORAGE_KEY = 'bridge/last-language';

export const getAPIVersionForModel: GetAPIVersionForModel = (model) =>
  !model?.apiGroup ? model.apiVersion : `${model.apiGroup}/${model.apiVersion}`;

export const referenceForModel = (model: K8sKind) =>
  `${model.apiGroup}~${model.apiVersion}~${model.kind}`;

export const referenceFor =
  (group: string) => (version: string) => (kind: string) =>
    `${group}~${version}~${kind}`;

// Operator uses`<kind>.<apiGroup>/<apiVersion>`
export const getGVK = (label: string) => {
  const kind = label?.slice(0, label.indexOf('.'));
  const apiGroup = label?.slice(label.indexOf('.') + 1, label.indexOf('/'));
  const apiVersion = label?.slice(label.indexOf('/') + 1, label.length);
  return { kind, apiGroup, apiVersion };
};

export const getGVKofResource = (resource: K8sResourceCommon) => {
  const { apiVersion: apiGroupVersion, kind } = resource;
  const [apiGroup, apiVersion] = apiGroupVersion.split('/');
  return referenceFor(apiGroup)(apiVersion)(kind);
};

export const referenceForGroupVersionKind =
  (group: string) => (version: string) => (kind: string) =>
    [group, version, kind].join('~');

export const resourcePathFromModel = (
  model: K8sKind,
  name?: string,
  namespace?: string
) => {
  const { plural, namespaced, crd } = model;

  let url = '/k8s/';

  if (!namespaced) {
    url += 'cluster/';
  }

  if (namespaced) {
    url += namespace ? `ns/${namespace}/` : 'all-namespaces/';
  }

  if (crd) {
    url += referenceForModel(model);
  } else if (plural) {
    url += plural;
  }

  if (name) {
    // Some resources have a name that needs to be encoded. For instance,
    // Users can have special characters in the name like `#`.
    url += `/${encodeURIComponent(name)}`;
  }

  return url;
};

export const isDefaultClass = (storageClass: K8sResourceKind) => {
  const annotations = _.get(storageClass, 'metadata.annotations') || {};
  return (
    annotations[defaultClassAnnotation] === 'true' ||
    annotations[betaDefaultStorageClassAnnotation] === 'true'
  );
};

export const getLastLanguage = (): string =>
  localStorage.getItem(LAST_LANGUAGE_LOCAL_STORAGE_KEY);

export const k8sPatchByName = <R extends K8sResourceCommon>(
  kind: K8sKind,
  name: string,
  namespace: string,
  data: Patch[]
) =>
  k8sPatch({
    model: kind,
    resource: { metadata: { name, namespace } },
    data: data,
  }) as Promise<R>;

export const groupVersionFor = (apiVersion: string) => ({
  group: apiVersion.split('/').length === 2 ? apiVersion.split('/')[0] : 'core',
  version:
    apiVersion.split('/').length === 2 ? apiVersion.split('/')[1] : apiVersion,
});

export const getReference = ({
  group,
  version,
  kind,
}: K8sGroupVersionKind): K8sResourceKindReference =>
  [group || 'core', version, kind].join('~');

export const referenceForOwnerRef = (
  ownerRef: OwnerReference
): GroupVersionKind =>
  referenceForGroupVersionKind(groupVersionFor(ownerRef.apiVersion).group)(
    groupVersionFor(ownerRef.apiVersion).version
  )(ownerRef.kind);

export const isFunctionThenApply = (fn: any) => (args: string) =>
  typeof fn === 'function' ? fn(args) : fn;

export const getInfrastructurePlatform = (
  infrastructure: K8sResourceKind
): string =>
  infrastructure?.spec?.platformSpec?.type || infrastructure?.status?.platform;

export const getGVKLabel = ({ kind, apiVersion, apiGroup }) =>
  `${kind.toLowerCase()}.${apiGroup}/${apiVersion}`;

export const getRandomChars = () => Math.random().toString(36).substring(7);

export const getErrorMessage = (error: Error) => error?.message;

export const isValidIP = (address) =>
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    address
  );
