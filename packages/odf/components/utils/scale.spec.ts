import { DiscoveredDevice, LocalDiskKind } from '@odf/core/types/scale';
import { Taint } from '@odf/shared/types';
import { WizardNodeState } from '../create-storage-system/reducer';
import {
  digestDeviceKey,
  filterUsedDiscoveredDevices,
  getDiscoveredDeviceKey,
  getLocalDiskNameFromDeviceKey,
  getTolerationsFromNodes,
  toLocalDiskNameToken,
} from './scale';

const makeNode = (taints?: Taint[]): WizardNodeState =>
  ({ name: 'node', taints }) as WizardNodeState;

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

describe('getTolerationsFromNodes', () => {
  it('returns an empty array when there are no nodes', () => {
    expect(getTolerationsFromNodes()).toEqual([]);
    expect(getTolerationsFromNodes([])).toEqual([]);
  });

  it('returns an empty array when nodes carry no taints', () => {
    expect(getTolerationsFromNodes([makeNode(), makeNode([])])).toEqual([]);
  });

  it('uses operator Equal for a taint with a value', () => {
    const node = makeNode([
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
    ]);
    expect(getTolerationsFromNodes([node])).toEqual([
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
    ]);
  });

  it('uses operator Exists for a taint without a value', () => {
    const node = makeNode([
      {
        key: 'node.kubernetes.io/disk-pressure',
        value: '',
        effect: 'NoExecute',
      },
    ]);
    expect(getTolerationsFromNodes([node])).toEqual([
      {
        key: 'node.kubernetes.io/disk-pressure',
        operator: 'Exists',
        effect: 'NoExecute',
      },
    ]);
  });

  it('builds the de-duplicated union across nodes', () => {
    const shared: Taint = {
      key: 'dedicated',
      value: 'storage',
      effect: 'NoSchedule',
    };
    const nodeA = makeNode([shared]);
    const nodeB = makeNode([
      shared,
      { key: 'tenant', value: 'a', effect: 'NoSchedule' },
    ]);

    expect(getTolerationsFromNodes([nodeA, nodeB])).toEqual([
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
      { key: 'tenant', operator: 'Equal', value: 'a', effect: 'NoSchedule' },
    ]);
  });

  it('keeps taints with the same key but different value or effect distinct', () => {
    const node = makeNode([
      { key: 'dedicated', value: 'storage', effect: 'NoSchedule' },
      { key: 'dedicated', value: 'storage', effect: 'NoExecute' },
      { key: 'dedicated', value: 'other', effect: 'NoSchedule' },
    ]);

    expect(getTolerationsFromNodes([node])).toHaveLength(3);
  });

  it('collapses an identical taint repeated within a single node', () => {
    const taint: Taint = {
      key: 'dedicated',
      value: 'storage',
      effect: 'NoSchedule',
    };
    const node = makeNode([taint, { ...taint }, { ...taint }]);

    expect(getTolerationsFromNodes([node])).toEqual([
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
    ]);
  });

  it('collapses the same taint appearing across multiple nodes into one toleration', () => {
    const taint: Taint = {
      key: 'dedicated',
      value: 'storage',
      effect: 'NoSchedule',
    };
    const nodes = [
      makeNode([{ ...taint }]),
      makeNode([{ ...taint }]),
      makeNode([{ ...taint }]),
    ];

    expect(getTolerationsFromNodes(nodes)).toEqual([
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
    ]);
  });

  it('emits exactly one toleration per distinct taint when duplicates are mixed in', () => {
    const dedicated: Taint = {
      key: 'dedicated',
      value: 'storage',
      effect: 'NoSchedule',
    };
    const tenant: Taint = { key: 'tenant', value: '', effect: 'NoExecute' };
    const nodes = [
      // duplicate within the node + a unique taint
      makeNode([{ ...dedicated }, { ...dedicated }, { ...tenant }]),
      // same taints repeated on another node
      makeNode([{ ...dedicated }, { ...tenant }]),
    ];

    const result = getTolerationsFromNodes(nodes);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        key: 'dedicated',
        operator: 'Equal',
        value: 'storage',
        effect: 'NoSchedule',
      },
      { key: 'tenant', operator: 'Exists', effect: 'NoExecute' },
    ]);
  });
});
