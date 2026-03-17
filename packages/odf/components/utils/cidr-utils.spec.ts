import { isIpInCidr, isValidCIDRFormat } from './cidr-utils';

describe('isIpInCidr', () => {
  it('returns true when IP is within CIDR (192.168.200.10 in 192.168.200.0/24)', () => {
    expect(isIpInCidr('192.168.200.10', '192.168.200.0/24')).toBe(true);
  });

  it('returns false when IP is outside CIDR (192.168.200.10 not in 12.168.200.0/12)', () => {
    expect(isIpInCidr('192.168.200.10', '12.168.200.0/12')).toBe(false);
  });

  it('returns true for network address', () => {
    expect(isIpInCidr('192.168.200.0', '192.168.200.0/24')).toBe(true);
  });

  it('returns true for broadcast address', () => {
    expect(isIpInCidr('192.168.200.255', '192.168.200.0/24')).toBe(true);
  });

  it('returns false for IP just outside range', () => {
    expect(isIpInCidr('192.168.201.0', '192.168.200.0/24')).toBe(false);
  });

  it('returns false for invalid IP', () => {
    expect(isIpInCidr('invalid', '192.168.200.0/24')).toBe(false);
  });

  it('returns false for invalid CIDR', () => {
    expect(isIpInCidr('192.168.200.10', 'invalid')).toBe(false);
  });
});

describe('isValidCIDRFormat', () => {
  it('returns true for valid CIDR', () => {
    expect(isValidCIDRFormat('192.168.200.0/24')).toBe(true);
    expect(isValidCIDRFormat('10.0.0.0/8')).toBe(true);
  });

  it('returns false for invalid octets', () => {
    expect(isValidCIDRFormat('999.168.200.0/24')).toBe(false);
    expect(isValidCIDRFormat('192.256.200.0/24')).toBe(false);
  });

  it('returns false for invalid format', () => {
    expect(isValidCIDRFormat('192.168.200.0')).toBe(false);
    expect(isValidCIDRFormat('invalid')).toBe(false);
    expect(isValidCIDRFormat('192.168.200.0/33')).toBe(false);
  });
});
