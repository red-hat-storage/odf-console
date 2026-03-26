import type { ErasureCodingSchema } from '@odf/core/types';
import { ERASURE_CODING_SCHEMES, ERASURE_CODING_MIN_NODES } from '../constants';

export const getStorageOverheadPercent = (k: number, m: number): number =>
  Math.round((m / k) * 100);

/** Recommended node count for a scheme (k+m+1 for better balancing/backfill). */
const getRecommendedNodeCount = (schema: { k: number; m: number }): number =>
  schema.k + schema.m + 1;

/**
 * Returns true if this schema is the recommended one for the given node count:
 * the scheme with the highest recommended node count (k+m+1) that still satisfies
 * nodeCount >= k+m+1 (so with more nodes we recommend the "best fit" scheme).
 */
export const isRecommendedSchema = (
  schema: { k: number; m: number },
  nodeCount: number
): boolean => {
  if (nodeCount < getRecommendedNodeCount(schema)) return false;
  const recommended = ERASURE_CODING_SCHEMES.filter(
    (s) => nodeCount >= getRecommendedNodeCount(s)
  ).reduce<ErasureCodingSchema | null>((best, s) => {
    const sVal = getRecommendedNodeCount(s);
    if (!best) return s;
    return sVal > getRecommendedNodeCount(best) ? s : best;
  }, null);
  return (
    recommended !== null &&
    recommended.k === schema.k &&
    recommended.m === schema.m
  );
};

export const getErasureCodingNodeValidation = (
  nodeCount: number
): { valid: boolean } => ({
  valid: nodeCount >= ERASURE_CODING_MIN_NODES,
});
