import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export enum Operator {
    Exists = 'Exists',
    DoesNotExist = 'DoesNotExist',
    In = 'In',
    NotIn = 'NotIn',
    Equals = 'Equals',
    NotEqual = 'NotEqual',
    GreaterThan = 'GreaterThan',
    LessThan = 'LessThan',
    NotEquals = 'NotEquals',
}

export type MatchExpression = {
    key: string;
    operator: Operator | string;
    values?: string[];
    value?: string;
};

export type K8sResourceKind = K8sResourceCommon & {
    spec?: {
      selector?: Selector | MatchLabels;
      [key: string]: any;
    };
    status?: { [key: string]: any };
    data?: { [key: string]: any };
};

export type Selector = {
    matchLabels?: MatchLabels;
    matchExpressions?: MatchExpression[];
};

export type MatchLabels = {
    [key: string]: string;
};

export type StorageSystemKind = K8sResourceCommon & {
    spec: {
        kind: string;
        name: string;
        namespace: string;
    };
    status: {
        phase: string;
    }
};

export type HumanizeResult = {
    value: number;
    unit: string;
    string: string;
};
