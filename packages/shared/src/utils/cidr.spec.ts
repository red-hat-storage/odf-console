import {
  doCidrListsOverlap,
  doCidrsOverlap,
  evaluateCidrListsOverlap,
  isValidCIDRFormat,
} from './cidr';

describe('doCidrsOverlap', () => {
  it('detects overlapping IPv4 CIDRs', () => {
    expect(doCidrsOverlap('10.128.0.0/14', '10.128.0.0/14')).toBe(true);
    expect(doCidrsOverlap('10.128.0.0/14', '10.132.0.0/14')).toBe(false);
    expect(doCidrsOverlap('172.30.0.0/16', '172.30.10.0/24')).toBe(true);
  });
});

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
    expect(
      evaluateCidrListsOverlap(['not-a-cidr'], ['10.128.0.0/14'])
    ).toBe('unknown');
  });

  it('returns overlap or none for valid CIDRs', () => {
    expect(
      evaluateCidrListsOverlap(['10.128.0.0/14'], ['10.128.0.0/14'])
    ).toBe('overlap');
    expect(
      evaluateCidrListsOverlap(['10.128.0.0/14'], ['10.132.0.0/14'])
    ).toBe('none');
  });
});

describe('isValidCIDRFormat', () => {
  it('validates IPv4 CIDR strings', () => {
    expect(isValidCIDRFormat('192.168.200.0/24')).toBe(true);
    expect(isValidCIDRFormat('192.168.200.0')).toBe(false);
  });
});
