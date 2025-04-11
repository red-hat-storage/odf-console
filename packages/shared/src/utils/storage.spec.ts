import { getStorageSizeInTiBWithoutUnit } from './storage';

describe('getStorageSizeInTiBWithoutUnit', () => {
  it('returns the correct amount in TiB', () => {
    const conversion: [unknown, number][] = [
      [null, 0],
      ['', 0],
      ['Gi', 0],
      ['1', 0],
      [1, 0], // Number primitive not allowed.
      ['1GiB', 0], // Non-allowed unit.
      ['0Gi', 0],
      ['0Ti', 0],
      ['102.4Gi', 0.1],
      ['512Gi', 0.5],
      ['0.5Ti', 0.5],
      ['1024Gi', 1],
      ['2Ti', 2],
    ];

    conversion.forEach(([input, output]) =>
      expect(getStorageSizeInTiBWithoutUnit(input as string)).toBe(output)
    );
  });
});
