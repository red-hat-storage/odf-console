/**
 * Store types that are essential but are not part of Console SDK
 */

import { K8sResourceCommon } from "@openshift-console/dynamic-plugin-sdk";

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

export type ClusterServiceVersionIcon = { base64data: string; mediatype: string };

export enum ClusterServiceVersionStatus {
    Failed = 'Failed',
    OK = 'OK',
    Pending = 'Pending',
    Unknown = 'Unknown',
}

export enum InstallModeType {
    InstallModeTypeOwnNamespace = 'OwnNamespace',
    InstallModeTypeSingleNamespace = 'SingleNamespace',
    InstallModeTypeMultiNamespace = 'MultiNamespace',
    InstallModeTypeAllNamespaces = 'AllNamespaces',
}

export type Descriptor<T = any> = {
    path: string;
    displayName: string;
    description: string;
    'x-descriptors'?: T[];
    value?: any;
};

export type CRDDescription = {
    name: string;
    version: string;
    kind: string;
    displayName: string;
    description?: string;
    specDescriptors?: Descriptor[];
    statusDescriptors?: Descriptor[];
    resources?: {
        name?: string;
        version: string;
        kind: string;
    }[];
};

export type APIServiceDefinition = {
    name: string;
    group: string;
    version: string;
    kind: string;
    deploymentName: string;
    containerPort: number;
    displayName: string;
    description?: string;
    specDescriptors?: Descriptor[];
    statusDescriptors?: Descriptor[];
    resources?: {
        name?: string;
        version: string;
        kind: string;
    }[];
};

export enum ClusterServiceVersionPhase {
    CSVPhaseNone = '',
    CSVPhasePending = 'Pending',
    CSVPhaseInstallReady = 'InstallReady',
    CSVPhaseInstalling = 'Installing',
    CSVPhaseSucceeded = 'Succeeded',
    CSVPhaseFailed = 'Failed',
    CSVPhaseUnknown = 'Unknown',
    CSVPhaseReplacing = 'Replacing',
    CSVPhaseDeleting = 'Deleting',
}

export enum CSVConditionReason {
    CSVReasonRequirementsUnknown = 'RequirementsUnknown',
    CSVReasonRequirementsNotMet = 'RequirementsNotMet',
    CSVReasonRequirementsMet = 'AllRequirementsMet',
    CSVReasonOwnerConflict = 'OwnerConflict',
    CSVReasonComponentFailed = 'InstallComponentFailed',
    CSVReasonInvalidStrategy = 'InvalidInstallStrategy',
    CSVReasonWaiting = 'InstallWaiting',
    CSVReasonInstallSuccessful = 'InstallSucceeded',
    CSVReasonInstallCheckFailed = 'InstallCheckFailed',
    CSVReasonComponentUnhealthy = 'ComponentUnhealthy',
    CSVReasonBeingReplaced = 'BeingReplaced',
    CSVReasonReplaced = 'Replaced',
    CSVReasonCopied = 'Copied',
}

export type RequirementStatus = {
    group: string;
    version: string;
    kind: string;
    name: string;
    status: string;
    uuid?: string;
};

export type ClusterServiceVersionKind = {
    apiVersion: 'operators.coreos.com/v1alpha1';
    kind: 'ClusterServiceVersion';
    spec: {
        install: {
            strategy: 'Deployment';
            spec: {
                permissions: {
                    serviceAccountName: string;
                    rules: { apiGroups: string[]; resources: string[]; verbs: string[] }[];
                }[];
                deployments: { name: string; spec: any }[];
            };
        };
        customresourcedefinitions?: { owned?: CRDDescription[]; required?: CRDDescription[] };
        apiservicedefinitions?: { owned?: APIServiceDefinition[]; required?: APIServiceDefinition[] };
        replaces?: string;
        installModes: { type: InstallModeType; supported: boolean }[];
        displayName?: string;
        description?: string;
        provider?: { name: string };
        version?: string;
        icon?: ClusterServiceVersionIcon[];
    };
    status?: {
        phase: ClusterServiceVersionPhase;
        reason: CSVConditionReason;
        requirementStatus?: RequirementStatus[];
    };
} & K8sResourceCommon;
