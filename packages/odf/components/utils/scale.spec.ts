import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import {
  digestDeviceKey,
  filterUsedDiscoveredDevices,
  getDiscoveredDeviceKey,
  getLocalDiskNameFromDeviceKey,
  toLocalDiskNameToken,
} from './scale';

const makeDevice = (
  overrides: Partial<DiscoveredDevice> = {}
): DiscoveredDevice => ({
  deviceID: '',
  path: '/dev/sdb',
  type: 'disk',
  size: 1000,
  WWN: '0x6001405c595842b2d484d0bb11e42179',
  nodeName: 'node-1',
  ...overrides,
});

describe('getDiscoveredDeviceKey', () => {
  it('prefers WWN when present', () => {
    expect(
      getDiscoveredDeviceKey(
        makeDevice({
          WWN: '0xabc',
          deviceID: 'ibm-75000000092461-e900-10',
          path: '/dev/dasda',
        })
      )
    ).toBe('0xabc');
  });

  it('uses deviceID for DASD devices with empty WWN', () => {
    expect(
      getDiscoveredDeviceKey(
        makeDevice({
          WWN: '',
          deviceID: 'ibm-75000000092461-e900-10',
          path: '/dev/dasda',
        })
      )
    ).toBe('ibm-75000000092461-e900-10');
  });

  it('uses WWN-only SAN devices without deviceID', () => {
    expect(
      getDiscoveredDeviceKey(
        makeDevice({
          WWN: '0x6001405c595842b2d484d0bb11e42179',
          deviceID: undefined,
          path: '/dev/sdb',
        })
      )
    ).toBe('0x6001405c595842b2d484d0bb11e42179');
  });

  it('falls back to path when WWN and deviceID are empty', () => {
    expect(
      getDiscoveredDeviceKey(
        makeDevice({
          WWN: '',
          deviceID: '',
          path: '/dev/dasda',
        })
      )
    ).toBe('/dev/dasda');
  });
});

describe('toLocalDiskNameToken / getLocalDiskNameFromDeviceKey', () => {
  it('keeps WWN tokens unchanged for existing LocalDisk compatibility', () => {
    const key = '0x6001405c595842b2d484d0bb11e42179';
    expect(toLocalDiskNameToken(key)).toBe(key);
    expect(getLocalDiskNameFromDeviceKey(key)).toBe(`localdisk-${key}`);
  });

  it('keeps DASD UID tokens unchanged', () => {
    const key = 'ibm-75000000092461-e900-10';
    expect(toLocalDiskNameToken(key)).toBe(key);
    expect(getLocalDiskNameFromDeviceKey(key)).toBe(`localdisk-${key}`);
  });

  it('encodes by-id deviceID paths as DNS-compatible names with a digest', () => {
    const key = '/dev/disk/by-id/scsi-35000c50015ff75aa';
    const digest = digestDeviceKey(key);
    expect(toLocalDiskNameToken(key)).toBe(
      `dev-disk-by-id-scsi-35000c50015ff75aa-${digest}`
    );
    expect(getLocalDiskNameFromDeviceKey(key)).toBe(
      `localdisk-dev-disk-by-id-scsi-35000c50015ff75aa-${digest}`
    );
  });

  it('encodes path-fallback keys as DNS-compatible names with a digest', () => {
    const key = '/dev/dasda';
    const digest = digestDeviceKey(key);
    expect(toLocalDiskNameToken(key)).toBe(`dev-dasda-${digest}`);
    expect(getLocalDiskNameFromDeviceKey(key)).toBe(
      `localdisk-dev-dasda-${digest}`
    );
  });

  it('keeps distinct names for keys that normalize to the same token', () => {
    const underscoreKey = '/dev/mapper/foo_bar';
    const hyphenKey = '/dev/mapper/foo-bar';

    const underscoreToken = toLocalDiskNameToken(underscoreKey);
    const hyphenToken = toLocalDiskNameToken(hyphenKey);

    expect(underscoreToken).not.toBe(hyphenToken);
    expect(underscoreToken).toBe(
      `dev-mapper-foo-bar-${digestDeviceKey(underscoreKey)}`
    );
    expect(hyphenToken).toBe(
      `dev-mapper-foo-bar-${digestDeviceKey(hyphenKey)}`
    );
  });

  it('keeps distinct names when truncation would otherwise collide', () => {
    const base = `/${'a'.repeat(300)}`;
    const keyA = `${base}-device-a`;
    const keyB = `${base}-device-b`;

    const tokenA = toLocalDiskNameToken(keyA);
    const tokenB = toLocalDiskNameToken(keyB);

    expect(tokenA).not.toBe(tokenB);
    expect(tokenA.endsWith(`-${digestDeviceKey(keyA)}`)).toBe(true);
    expect(tokenB.endsWith(`-${digestDeviceKey(keyB)}`)).toBe(true);
    expect(getLocalDiskNameFromDeviceKey(keyA).length).toBeLessThanOrEqual(253);
    expect(getLocalDiskNameFromDeviceKey(keyB).length).toBeLessThanOrEqual(253);
  });
});

describe('filterUsedDiscoveredDevices', () => {
  it('filters SAN devices already used as LocalDisks', () => {
    const wwn = '0x6001405c595842b2d484d0bb11e42179';
    const devices = [makeDevice({ WWN: wwn }), makeDevice({ WWN: '0xother' })];
    const localDisks = [
      {
        metadata: { name: getLocalDiskNameFromDeviceKey(wwn) },
      } as LocalDiskKind,
    ];

    expect(filterUsedDiscoveredDevices(devices, localDisks)).toEqual([
      makeDevice({ WWN: '0xother' }),
    ]);
  });

  it('filters DASD devices by UID even when the UID contains dashes', () => {
    const dasdUID = 'ibm-75000000092461-e900-10';
    const devices = [
      makeDevice({
        WWN: '',
        deviceID: dasdUID,
        path: '/dev/dasda',
      }),
      makeDevice({
        WWN: '',
        deviceID: 'ibm-75000000092462-e900-11',
        path: '/dev/dasdb',
      }),
    ];
    const localDisks = [
      {
        metadata: { name: getLocalDiskNameFromDeviceKey(dasdUID) },
      } as LocalDiskKind,
    ];

    expect(filterUsedDiscoveredDevices(devices, localDisks)).toEqual([
      makeDevice({
        WWN: '',
        deviceID: 'ibm-75000000092462-e900-11',
        path: '/dev/dasdb',
      }),
    ]);
  });

  it('filters path-fallback devices using the encoded LocalDisk name', () => {
    const path = '/dev/dasda';
    const devices = [
      makeDevice({ WWN: '', deviceID: '', path }),
      makeDevice({ WWN: '', deviceID: '', path: '/dev/dasdb' }),
    ];
    const localDisks = [
      {
        metadata: { name: getLocalDiskNameFromDeviceKey(path) },
      } as LocalDiskKind,
    ];

    expect(filterUsedDiscoveredDevices(devices, localDisks)).toEqual([
      makeDevice({ WWN: '', deviceID: '', path: '/dev/dasdb' }),
    ]);
  });

  it('filters by-id deviceID keys using the encoded LocalDisk name', () => {
    const byId = '/dev/disk/by-id/scsi-35000c50015ff75aa';
    const devices = [
      makeDevice({ WWN: '', deviceID: byId, path: '/dev/sdb' }),
      makeDevice({
        WWN: '',
        deviceID: '/dev/disk/by-id/scsi-35000c50015ea75bb',
        path: '/dev/sdc',
      }),
    ];
    const localDisks = [
      {
        metadata: { name: getLocalDiskNameFromDeviceKey(byId) },
      } as LocalDiskKind,
    ];

    expect(filterUsedDiscoveredDevices(devices, localDisks)).toEqual([
      makeDevice({
        WWN: '',
        deviceID: '/dev/disk/by-id/scsi-35000c50015ea75bb',
        path: '/dev/sdc',
      }),
    ]);
  });

  it('does not hide a colliding normalized path when the digest differs', () => {
    const underscorePath = '/dev/mapper/foo_bar';
    const hyphenPath = '/dev/mapper/foo-bar';
    const devices = [
      makeDevice({ WWN: '', deviceID: '', path: underscorePath }),
      makeDevice({ WWN: '', deviceID: '', path: hyphenPath }),
    ];
    const localDisks = [
      {
        metadata: {
          name: getLocalDiskNameFromDeviceKey(underscorePath),
        },
      } as LocalDiskKind,
    ];

    expect(filterUsedDiscoveredDevices(devices, localDisks)).toEqual([
      makeDevice({ WWN: '', deviceID: '', path: hyphenPath }),
    ]);
  });
});
