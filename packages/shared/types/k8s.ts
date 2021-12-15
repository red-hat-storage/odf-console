import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";
import { MatchExpression } from "@openshift-console/dynamic-plugin-sdk/lib/api/common-types";

export type StorageClassResourceKind = {
    provisioner: string;
    reclaimPolicy: string;
    parameters?: {
        [key: string]: string;
    };
} & K8sResourceCommon;

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

export type NodeKind = {
    spec: {
        taints?: Taint[];
        unschedulable?: boolean;
    };
    status?: {
        capacity?: {
            [key: string]: string;
        };
        conditions?: NodeCondition[];
        images?: {
            names: string[];
            sizeBytes?: number;
        }[];
        phase?: string;
        nodeInfo?: {
            operatingSystem: string;
        };
    };
} & K8sResourceCommon;

export type Taint = {
    key: string;
    value: string;
    effect: TaintEffect;
};

export type TaintEffect = '' | 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';

export type NodeCondition = {
    lastHeartbeatTime?: string;
} & K8sResourceCondition;

export type K8sResourceCondition = {
    type: string;
    status: keyof typeof K8sResourceConditionStatus;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
};

export enum K8sResourceConditionStatus {
    True = 'True',
    False = 'False',
    Unknown = 'Unknown',
}
