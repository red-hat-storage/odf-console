export enum BackingStorageType {
    EXISTING = 'existing',
    LOCAL_DEVICES = 'local-devices',
    EXTERNAL = 'external',
}

export enum DeploymentType {
    FULL = 'Full deployment',
    MCG = 'MultiCloud Object Gateway',
}

export enum ValidationType {
    'MINIMAL' = 'MINIMAL',
    'INTERNALSTORAGECLASS' = 'INTERNALSTORAGECLASS',
    'BAREMETALSTORAGECLASS' = 'BAREMETALSTORAGECLASS',
    'ALLREQUIREDFIELDS' = 'ALLREQUIREDFIELDS',
    'MINIMUMNODES' = 'MINIMUMNODES',
    'ENCRYPTION' = 'ENCRYPTION',
    'REQUIRED_FIELD_KMS' = 'REQUIRED_FIELD_KMS',
    'NETWORK' = 'NETWORK',
    'INTERNAL_FLEXIBLE_SCALING' = 'INTERNAL_FLEXIBLE_SCALING',
    'ATTACHED_DEVICES_FLEXIBLE_SCALING' = 'ATTACHED_DEVICES_FLEXIBLE_SCALING',
}

export type EncryptionType = {
    clusterWide: boolean;
    storageClass: boolean;
    advanced: boolean;
    hasHandled: boolean;
};

export type NodesPerZoneMap = {
    [zones: string]: number;
};
