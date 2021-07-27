import {
    K8sResourceCommon,
} from 'badhikar-dynamic-plugin-sdk';

export type K8sListKind<T = K8sResourceCommon> = K8sResourceCommon & {
    items: T[];
};
