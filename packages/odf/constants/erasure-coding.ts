import type { ErasureCodingSchema } from '@odf/core/types';

export const ERASURE_CODING_SCHEMES: ErasureCodingSchema[] = [
  { k: 2, m: 2 },
  { k: 4, m: 2 },
  { k: 8, m: 3 },
  { k: 8, m: 4 },
];

export const ERASURE_CODING_MIN_NODES = Math.min(
  ...ERASURE_CODING_SCHEMES.map((s) => s.k + s.m)
);

export const ERASURE_CODING_CEPHFS_DATA_POOL_POSTFIX = 'erasure-coded';
export const ERASURE_CODING_BLOCK_METADATA_POOL_NAME =
  'replicated-metadata-pool';
