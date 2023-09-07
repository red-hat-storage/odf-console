import {
  getAPIVersion,
  getName,
  getNamespace,
  getUID,
} from '@odf/shared/selectors';
import { groupVersionFor, referenceFor } from '@odf/shared/utils';
import {
  ObjectReference,
  K8sResourceCommon,
} from '@openshift-console/dynamic-plugin-sdk';

export const getGVKFromObjectRef = (objectRef: ObjectReference) => {
  const { group, version } = groupVersionFor(objectRef?.apiVersion || '');
  return referenceFor(group)(version)(objectRef?.kind);
};

export const getGVKFromK8Resource = (resource: K8sResourceCommon) => {
  const { group, version } = groupVersionFor(resource?.apiVersion || '');
  return referenceFor(group)(version)(resource?.kind);
};

export const createRefFromK8Resource = (
  resource: K8sResourceCommon
): ObjectReference => ({
  name: getName(resource),
  namespace: getNamespace(resource),
  apiVersion: getAPIVersion(resource),
  kind: resource?.kind,
  uid: getUID(resource),
});

export const getMajorVersion = (version: string): string => {
  return !!version
    ? version.split('.')[0] + '.' + version.split('.')[1] + '.0'
    : '';
};

export const getValidatedProp = (error: boolean) =>
  error ? 'error' : 'default';
