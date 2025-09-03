import { createFakeNodesData } from '../../../jest/helpers';
import {
  OCS_DEVICE_SET_MINIMUM_REPLICAS,
  OCS_DEVICE_SET_ARBITER_REPLICAS,
} from '../constants';
import { getNodeTotalMemory, getDeviceSetCount } from './ocs';

describe('getNodeTotalMemory', () => {
  it('returns node memory from metric by default', () => {
    const metricMemory = 32;
    const memory = 8;
    const node = createFakeNodesData(1, 12, metricMemory, memory)[0];

    expect(getNodeTotalMemory(node)).toEqual(String(metricMemory));
  });

  it('returns node CR memory when no metric', () => {
    const metricMemory = undefined;
    const memory = 8;
    const node = createFakeNodesData(1, 12, metricMemory, memory)[0];

    expect(getNodeTotalMemory(node)).toEqual(String(memory));
  });
});

describe('getDeviceSetCount', () => {
  it('Day-1: requires at least 4 PVs for arbiter cluster', () => {
    expect(
      getDeviceSetCount(2, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(1); // fallback (not valid for real day-1)
    expect(
      getDeviceSetCount(3, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(1); // fallback (not valid for real day-1)

    expect(
      getDeviceSetCount(4, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(1);
    expect(
      getDeviceSetCount(6, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(2);
  });

  it('Day-2: expansion by 2 PVs is allowed for arbiter cluster', () => {
    expect(
      getDeviceSetCount(6, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(2);
    expect(
      getDeviceSetCount(10, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(3);
  });

  it('Day-2: expansion by 4 PVs also works for arbiter cluster', () => {
    expect(
      getDeviceSetCount(8, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(2);
    expect(
      getDeviceSetCount(12, OCS_DEVICE_SET_ARBITER_REPLICAS, false, true)
    ).toBe(3);
  });

  it('Non arbiter/flexibleScaling cluster behaves normally', () => {
    expect(
      getDeviceSetCount(4, OCS_DEVICE_SET_MINIMUM_REPLICAS, false, false)
    ).toBe(1);
    expect(
      getDeviceSetCount(6, OCS_DEVICE_SET_MINIMUM_REPLICAS, false, false)
    ).toBe(2);
    expect(
      getDeviceSetCount(8, OCS_DEVICE_SET_MINIMUM_REPLICAS, false, false)
    ).toBe(2);
  });

  it('Flexible scaling ignores arbiter logic', () => {
    expect(getDeviceSetCount(5, 1, true, true)).toBe(5);
    expect(getDeviceSetCount(7, 1, true, false)).toBe(7);
  });
});
