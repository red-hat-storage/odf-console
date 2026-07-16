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
    const p = parseInt(parts[i], 10);
    if (isNaN(p) || p < 0 || p > 255) {
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
  const prefix = Number(prefixText);
  const ipInt = ipToNumber(ip);
  if (ipInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
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
