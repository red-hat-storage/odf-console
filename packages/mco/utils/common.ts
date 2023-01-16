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
