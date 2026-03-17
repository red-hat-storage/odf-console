import { MON_IP_ANNOTATION } from '@odf/core/constants/network';
import { getAnnotations } from '@odf/shared/selectors';

/**
 * IPv4 CIDR utilities. IPv6 is not supported.
 */

const ipToNumber = (ip: string): number | null => {
  if (!ip) return null;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (let i = 0; i < 4; i++) {
    const p = parseInt(parts[i], 10);
    if (isNaN(p) || p < 0 || p > 255) return null;
    n = n * 256 + p;
  }
  return n;
};

/**
 * Check if an IPv4 address falls within a CIDR range.
 * Returns false for invalid inputs or non-IPv4.
 */
export const isIpInCidr = (ip: string, cidr: string): boolean => {
  const ipNum = ipToNumber(ip?.trim());
  const [base, prefixStr] = (cidr || '').trim().split('/');
  const prefix = parseInt(prefixStr, 10);
  if (ipNum === null || isNaN(prefix) || prefix < 0 || prefix > 32)
    return false;
  const baseNum = ipToNumber(base);
  if (baseNum === null) return false;
  const blockSize = 2 ** (32 - prefix);
  const network = Math.floor(baseNum / blockSize) * blockSize;
  const broadcast = network + blockSize - 1;
  return ipNum >= network && ipNum <= broadcast;
};

/**
 * Validate CIDR format (e.g. 192.168.0.0/24). Checks structure and octet range (0-255).
 */
export const isValidCIDRFormat = (value: string): boolean => {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  const cidrRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(trimmed)) return false;
  const [base, prefixStr] = trimmed.split('/');
  const mask = parseInt(prefixStr, 10);
  if (isNaN(mask) || mask < 0 || mask > 32) return false;
  return ipToNumber(base) !== null;
};

/**
 * Extract mon-ip annotation from node (supports both WizardNodeState and NodeKind via getAnnotations)
 */
export const getMonIp = (node: {
  annotations?: Record<string, string>;
  metadata?: { annotations?: Record<string, string> };
}): string | undefined =>
  getAnnotations(node as any, node.annotations)?.[MON_IP_ANNOTATION]?.trim?.();
