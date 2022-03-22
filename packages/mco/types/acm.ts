import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Selector } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';

export type ApplicationKind = K8sResourceCommon & {
    spec: {
        componentKinds: {
            group: string;
            kind: string;
        }[],
        selector?: Selector | null;
    };
    status?: {
        phase: string;
    };
};

export type PlacementRuleKind = K8sResourceCommon & {
    spec: {
        clusterReplicas?: number
        clusterConditions?: {
            status: string;
            type: string;
        }[];
        clusterSelector?: Selector | null;
        schedulerName?: string;
    };
    status?: {
        decisions?: {
            clusterName: string;
            clusterNamespace: string;
        }[];
    };
};

export type SubscriptionKind = K8sResourceCommon & {
    spec: {
        name?: string;
        placement?: {
            placementRef?: {
                kind: string;
                name: string;
            };
        };
    };
    status?: {
        message?: string;
        phase?: string;
        statuses?: any;
    };
};
