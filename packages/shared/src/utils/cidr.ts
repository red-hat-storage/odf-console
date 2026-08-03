export const ipToNumber = (ip: string): number | null => {
  if (!ip) {
    return null;
  }
  const parts = ip.trim().split('.');
  if (parts.length !== 4) {
    return null;
  }
  let n = 0;
  for (let i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(parts[i])) {
      return null;
    }
    const p = Number(parts[i]);
    if (!Number.isInteger(p) || p < 0 || p > 255) {
      return null;
    }
    n = n * 256 + p;
  }
  return n;
};

export const parseCidrRange = (
  cidr: string
): { start: number; end: number } | null => {
  const [ip, prefixText] = (cidr || '').trim().split('/');
  if (!prefixText || !/^\d{1,2}$/.test(prefixText)) {
    return null;
  }
  const prefix = Number(prefixText);
  const ipInt = ipToNumber(ip);
  if (
    ipInt === null ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return null;
  }
  const blockSize = 2 ** (32 - prefix);
  const start = Math.floor(ipInt / blockSize) * blockSize;
  const end = start + blockSize - 1;
  return { start, end };
};

export const isIpInCidr = (ip: string, cidr: string): boolean => {
  const ipNum = ipToNumber(ip?.trim());
  const range = parseCidrRange(cidr);
  if (ipNum === null || !range) {
    return false;
  }
  return ipNum >= range.start && ipNum <= range.end;
};

export const isValidCIDRFormat = (value: string): boolean => {
  if (!value?.trim()) {
    return false;
  }
  const trimmed = value.trim();
  const cidrRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(trimmed)) {
    return false;
  }
  return parseCidrRange(trimmed) !== null;
};

export const doCidrsOverlap = (left: string, right: string): boolean => {
  const leftRange = parseCidrRange(left);
  const rightRange = parseCidrRange(right);
  if (!leftRange || !rightRange) {
    return false;
  }
  return leftRange.start <= rightRange.end && rightRange.start <= leftRange.end;
};

export const doCidrListsOverlap = (
  left: string[] = [],
  right: string[] = []
): boolean =>
  left.some((leftCidr) =>
    right.some((rightCidr) => doCidrsOverlap(leftCidr, rightCidr))
  );

export enum CidrOverlapResult {
  Overlap = 'overlap',
  None = 'none',
  Unknown = 'unknown',
}

export const evaluateCidrListsOverlap = (
  left: string[] = [],
  right: string[] = []
): CidrOverlapResult => {
  const cidrs = [...left, ...right];
  if (cidrs.some((cidr) => parseCidrRange(cidr) === null)) {
    return CidrOverlapResult.Unknown;
  }
  return doCidrListsOverlap(left, right)
    ? CidrOverlapResult.Overlap
    : CidrOverlapResult.None;
};

export const asStringArray = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item === 'string') {
      return [item];
    }
    if (item && typeof item === 'object' && 'cidr' in item) {
      const cidr = (item as { cidr: unknown }).cidr;
      return typeof cidr === 'string' ? [cidr] : [];
    }
    return [];
  });
};
