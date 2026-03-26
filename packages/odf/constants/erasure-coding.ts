import type { ErasureCodingSchema } from '@odf/core/types';

/**
 * Supported erasure coding k+m schemes per ODF design.
 * Min nodes = k + m (k+m+1 recommended for better balancing/backfill).
 * Storage overhead = (m/k)*100 (e.g. 4+2 -> 50%).
 */
export const ERASURE_CODING_SCHEMES: ErasureCodingSchema[] = [
  { k: 2, m: 1 },
  { k: 2, m: 2 },
  { k: 4, m: 2 },
  { k: 8, m: 3 },
  { k: 8, m: 4 },
];

/** Minimum nodes required for the smallest EC scheme (used to validate before showing schema). */
export const ERASURE_CODING_MIN_NODES = Math.min(
  ...ERASURE_CODING_SCHEMES.map((s) => s.k + s.m)
);

/**
 * Name of the additional CephFS EC data pool when erasure coding is enabled.
 * Must match managedResources.cephFilesystems.defaultStorageClassDataPoolName.
 */
export const ERASURE_CODING_FILESYSTEM_DATA_POOL_NAME = 'fserasurecoded';
/**
 * Replicated pool for RBD metadata when the default block pool is erasure coded.
 * Referenced by StorageCluster managedResources.cephBlockPools.erasureCodedMetadataPool.
 */
export const ERASURE_CODING_BLOCK_METADATA_POOL_NAME =
  'replicated-metadata-pool';
