import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type ManagedCluster = {
    name: string,
    region: string,
    s3ProfileName: string,
};

export type DRPolicyKind = K8sResourceCommon & {
    spec: {
        schedulingInterval: String;
        drClusterSet: ManagedCluster[];
    };
    status: {
        phase: string;
    };
};
