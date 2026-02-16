import { Model } from '@odf/odf-plugin-sdk/extensions';
import {
  CLIENT_PLUGIN_BUILD_NAME,
  PLUGIN_NAME,
} from '@odf/shared/constants/common';
import {
  InfraProviders,
  InfrastructureKind,
  K8sResourceKind,
  Patch,
  SubscriptionKind,
} from '@odf/shared/types';
import {
  consoleFetchJSON,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  K8sGroupVersionKind,
  K8sResourceKindReference,
  OwnerReference,
  GroupVersionKind,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk-internal/lib/extensions/console-types';
import * as fuzzy from 'fuzzysearch';
import * as _ from 'lodash-es';
import { GetAPIVersionForModel } from '../types';

const defaultClassAnnotation = 'storageclass.kubernetes.io/is-default-class';
const betaDefaultStorageClassAnnotation =
  'storageclass.beta.kubernetes.io/is-default-class';
export const LAST_LANGUAGE_LOCAL_STORAGE_KEY = 'bridge/last-language';

export const isClientPlugin = () => PLUGIN_NAME === CLIENT_PLUGIN_BUILD_NAME;

export const isNotFoundError = (loadError): boolean =>
  _.get(loadError, 'response.status') === 404;

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
  if (!resource) return null;
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

export const isFunctionThenApply =
  (fn: any) =>
  (...args) =>
    typeof fn === 'function' ? fn(...args) : fn;

export const getInfrastructurePlatform = (
  infrastructure: InfrastructureKind
): InfraProviders =>
  infrastructure?.spec?.platformSpec?.type || infrastructure?.status?.platform;

export const getGVKLabel = ({ kind, apiGroup, apiVersion }: Model) =>
  `${kind.toLowerCase()}.${apiGroup}/${apiVersion}`;

export const getRandomChars = () => Math.random().toString(36).substring(2, 10);

export const getErrorMessage = (error: Error) => error?.message;

export const isValidIP = (address) =>
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    address
  );

export const getValidatedProp = (error: boolean) =>
  error ? 'error' : 'default';

export const isAbortError = (err): boolean => err?.name === 'AbortError';

export const getPageRange = (currentPage: number, perPage: number) => {
  const indexOfLastRow = currentPage * perPage;
  const indexOfFirstRow = indexOfLastRow - perPage;
  return [indexOfFirstRow, indexOfLastRow];
};

/**
 * This ensures we do not return empty filtered data from `useListPageFilter` hook
 * as it would cause the `ListPageFilter` to not render the `FilterToolbar`.
 */
export const getValidFilteredData = <T>(filteredData: T[]): T[] =>
  _.isEmpty(filteredData) ? [null] : filteredData;

export const getOprVersionFromCSV = (operator: K8sResourceKind): string =>
  operator?.spec?.version || '';

export const getOprChannelFromSub = (sub: SubscriptionKind): string =>
  sub?.spec?.channel;

export const parseOprMajorMinorVersion = (version: string): string => {
  const majorMinorVersionRegex = /[0-9]+\.[0-9]+/;
  // parse major and minor version and
  // removes leading zeros from the version string
  return majorMinorVersionRegex.exec(version)?.[0]?.replace(/^0+/, '');
};

export const getOprMajorMinorVersion = (operator: K8sResourceKind): string =>
  parseOprMajorMinorVersion(getOprVersionFromCSV(operator));

export const numberInputOnChange =
  (min: number, max: number, onChange: (value: number) => void) =>
  (input: React.FormEvent<HTMLInputElement>): void => {
    const inputValue = +(input.target as HTMLInputElement)?.value;
    if (!!min && inputValue < min) onChange(min);
    else if (!!max && inputValue > max) onChange(max);
    else onChange(inputValue);
  };

export const fuzzyCaseInsensitive = (a: string, b: string): boolean =>
  fuzzy(_.toLower(a), _.toLower(b));

export const deepSortObject = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return obj.map(deepSortObject) as T;
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = deepSortObject(obj[key]);
        return acc;
      }, {} as T);
  }
  return obj;
};

export const swrFetcher = <T>(url: string): Promise<T> => consoleFetchJSON(url);
