import type { ErasureCodingSchema } from '@odf/core/types';
import { ERASURE_CODING_SCHEMES, ERASURE_CODING_MIN_NODES } from '../constants';

export const getStorageOverheadPercent = (k: number, m: number): number =>
  Math.round((m / k) * 100);

const getRecommendedNodeCount = (schema: { k: number; m: number }): number =>
  schema.k + schema.m + 1;

export const isRecommendedScheme = (
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
