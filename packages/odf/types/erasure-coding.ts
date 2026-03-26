/**
 * Erasure coding scheme: k data chunks, m parity chunks.
 * Min nodes = k + m (k+m+1 recommended for better balancing/backfill).
 */
export type ErasureCodingSchema = { k: number; m: number };
