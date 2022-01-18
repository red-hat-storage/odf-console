import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

type GetStringProperty<T = K8sResourceCommon> = (resource: T) => string;

export const getName: GetStringProperty = (resource) => resource?.metadata?.name;

export const getUID: GetStringProperty = (resource) => resource?.metadata?.uid;
