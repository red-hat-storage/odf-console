import type { ErasureCodingSchema } from '@odf/core/types';

/**
 * Supported erasure coding k+m schemes per ODF design.
 * Min nodes = k + m (k+m+1 recommended for better balancing/backfill).
 * Storage overhead = (m/k)*100 (e.g. 4+2 -> 50%).
 */
export const ERASURE_CODING_SCHEMES: ErasureCodingSchema[] = [
  { k: 1, m: 1 },
  { k: 2, m: 1 },
  { k: 2, m: 2 },
  { k: 4, m: 2 },
  { k: 8, m: 3 },
  { k: 8, m: 4 },
]; // used invalid schemes also to check these in the cloud clusters will modify in the next commit.

/** Minimum nodes required for the smallest EC scheme (used to validate before showing schema). */
export const ERASURE_CODING_MIN_NODES = Math.min(
  ...ERASURE_CODING_SCHEMES.map((s) => s.k + s.m)
);
