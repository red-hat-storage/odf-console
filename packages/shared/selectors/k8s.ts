import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';
import { K8sResourceKind } from '../types';

type GetStringProperty<T = K8sResourceCommon> = (resource: T) => string;

export const getName: GetStringProperty = (resource) =>
  resource?.metadata?.name;

export const getUID: GetStringProperty = (resource) => resource?.metadata?.uid;

export const hasLabel = (obj: K8sResourceCommon, label: string): boolean =>
  _.has(obj, ['metadata', 'labels', label]);

export const getLabel = <A extends K8sResourceCommon = K8sResourceCommon>(
  value: A,
  label: string,
  defaultValue?: string
) =>
  _.has(value, 'metadata.labels') ? value.metadata.labels[label] : defaultValue;

export const getLabels = <A extends K8sResourceCommon = K8sResourceCommon>(
  value: A
) => _.get(value, 'metadata.labels') as K8sResourceCommon['metadata']['labels'];

export const getNamespace = <A extends K8sResourceCommon = K8sResourceCommon>(
  value: A
) =>
  _.get(
    value,
    'metadata.namespace'
  ) as K8sResourceCommon['metadata']['namespace'];

export const getAnnotations = <A extends K8sResourceCommon = K8sResourceCommon>(
  value: A,
  defaultValue?: K8sResourceCommon['metadata']['annotations']
) =>
  _.has(value, 'metadata.annotations')
    ? value.metadata.annotations
    : defaultValue;

export const getInfrastructurePlatform = (
  infrastructure: K8sResourceKind
): string =>
  infrastructure && infrastructure.status
    ? infrastructure.status.platform
    : undefined;

export const getAPIVersion = <A extends K8sResourceCommon = K8sResourceCommon>(
  value: A
) => _.get(value, 'apiVersion') as K8sResourceCommon['apiVersion'];
