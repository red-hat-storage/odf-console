import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";

export type StorageClusterKind = K8sResourceCommon & {
    spec: {
        network: {
            provider: string;
            selectors: {
                public: string;
                private?: string;
            };
        };
        manageNodes: boolean;
        storageDeviceSets: DeviceSet[];
        resources: StorageClusterResource;
        encryption?: {
            enable: boolean;
            kms?: {
                enable: boolean;
            };
        };
        arbiter: {
            enable: boolean;
        };
        nodeTopologies: {
            arbiterLocation: string;
        };
        flexibleScaling?: boolean;
        monDataDirHostPath?: string;
    };
    status?: {
        phase: string;
        failureDomain?: string;
    };
};

export type DeviceSet = {
    name: string;
    count: number;
    replica: number;
    resources: ResourceConstraints;
    placement?: any;
    portable: boolean;
    dataPVCTemplate: {
        spec: {
            storageClassName: string;
            accessModes: string[];
            volumeMode: string;
            resources: {
                requests: {
                    storage: string;
                };
            };
        };
    };
};

export type StorageClusterResource = {
    mds?: ResourceConstraints;
    rgw?: ResourceConstraints;
};

export type ResourceConstraints = {
    limits?: {
        cpu: string;
        memory: string;
    };
    requests?: {
        cpu: string;
        memory: string;
    };
};
