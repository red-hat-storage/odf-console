import {
  CidrOverlapResult,
  asStringArray,
  doCidrListsOverlap,
  evaluateCidrListsOverlap,
  isValidCIDRFormat,
} from './cidr';

describe('doCidrListsOverlap', () => {
  it('returns true when any pair overlaps', () => {
    expect(
      doCidrListsOverlap(['10.128.0.0/14'], ['10.130.0.0/16', '10.200.0.0/16'])
    ).toBe(true);
    expect(doCidrListsOverlap(['10.128.0.0/14'], ['10.200.0.0/16'])).toBe(
      false
    );
  });
});

describe('evaluateCidrListsOverlap', () => {
  it('returns unknown when any CIDR cannot be parsed', () => {
    expect(evaluateCidrListsOverlap(['not-a-cidr'], ['10.128.0.0/14'])).toBe(
      CidrOverlapResult.Unknown
    );
  });

  it('returns overlap or none for valid CIDRs', () => {
    expect(evaluateCidrListsOverlap(['10.128.0.0/14'], ['10.128.0.0/14'])).toBe(
      CidrOverlapResult.Overlap
    );
    expect(evaluateCidrListsOverlap(['10.128.0.0/14'], ['10.132.0.0/14'])).toBe(
      CidrOverlapResult.None
    );
  });
});

describe('isValidCIDRFormat', () => {
  it('validates IPv4 CIDR strings', () => {
    expect(isValidCIDRFormat('192.168.200.0/24')).toBe(true);
    expect(isValidCIDRFormat('192.168.200.0')).toBe(false);
    expect(isValidCIDRFormat('999.168.200.0/24')).toBe(false);
    expect(isValidCIDRFormat('192.168.200.0/33')).toBe(false);
    expect(isValidCIDRFormat('10.0.0.0/')).toBe(false);
    expect(isValidCIDRFormat('10.0.0.3x')).toBe(false);
  });
});

describe('asStringArray', () => {
  it('normalizes string, string[], and { cidr }[] values', () => {
    expect(asStringArray('10.128.0.0/14')).toEqual(['10.128.0.0/14']);
    expect(asStringArray(['172.30.0.0/16'])).toEqual(['172.30.0.0/16']);
    expect(asStringArray([{ cidr: '10.128.0.0/14' }])).toEqual([
      '10.128.0.0/14',
    ]);
  });

  it('returns an empty list for unsupported values', () => {
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray(42)).toEqual([]);
    expect(asStringArray([{ cidr: 1 }, null, '10.0.0.0/8'])).toEqual([
      '10.0.0.0/8',
    ]);
  });
});
