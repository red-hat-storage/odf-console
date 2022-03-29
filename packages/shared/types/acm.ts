import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";

export type Conditions = {
    status: string
    type: string
}

export type ACMMultiClusterObservability = K8sResourceCommon & {
    status?: {
        conditions: Conditions[]
    };
}
