import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type ManagedCluster = {
    name: string,
    region: string,
    s3ProfileName: string,
};

export type Conditions = {
    status: string,
    type: string,
}

export type DRPolicyKind = K8sResourceCommon & {
    spec: {
        schedulingInterval: String;
        drClusterSet: ManagedCluster[];
    };
    status: {
        conditions: Conditions[];
        phase: string;
    };
};
