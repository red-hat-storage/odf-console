import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import * as _ from 'lodash';

type GetStringProperty<T = K8sResourceCommon> = (resource: T) => string;

export const getName: GetStringProperty = (resource) => resource?.metadata?.name;

export const getUID: GetStringProperty = (resource) => resource?.metadata?.uid;

export const getAnnotations = <A extends K8sResourceCommon = K8sResourceCommon>(
    value: A,
    defaultValue?: K8sResourceCommon['metadata']['annotations'],
) => (_.has(value, 'metadata.annotations') ? value.metadata.annotations : defaultValue);
