import { MON_IP_ANNOTATION } from '@odf/core/constants/network';
import { getAnnotations } from '@odf/shared/selectors';

/**
 * Extract mon-ip annotation from node (supports both WizardNodeState and NodeKind via getAnnotations)
 */
export const getMonIp = (node: {
  annotations?: Record<string, string>;
  metadata?: { annotations?: Record<string, string> };
}): string | undefined =>
  getAnnotations(node as any, node.annotations)?.[MON_IP_ANNOTATION]?.trim?.();
