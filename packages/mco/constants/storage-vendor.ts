export enum StorageVendorId {
  DataFoundation = 'data-foundation',
  IbmStorageScale = 'ibm-storage-scale',
  Generic = 'generic',
}

/** Implementations live with the wizard UI; the registry stays free of React. */
export enum PrePairCheckId {
  OdfPrerequisites = 'odf-prerequisites',
  StorageClassCompatibility = 'storage-class-compatibility',
  Submariner = 'submariner',
}

/** How the wizard sets up S3; a provider with both modes needs a Configure choice, not built yet. */
export enum S3Mode {
  Internal = 'internal',
  External = 'external',
}

/** How a provider decides the replication type. */
export enum ReplicationMode {
  Derived = 'derived',
  Fixed = 'fixed',
  Async = 'async',
}

/** Whether the user types the policy name or the provider generates it. */
export enum PolicyNameSource {
  User = 'user',
  Generated = 'generated',
}
